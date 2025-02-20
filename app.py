# app.py
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import xlsxwriter
from xml.etree import ElementTree
from datetime import datetime
from io import BytesIO
import gradio as gr

def process_xml(xml_file):
    try:
        # Parse the XML file
        tree = ElementTree.parse(xml_file)
        root = tree.getroot()
        # Define XML namespaces
        namespace = {'atom': 'http://www.w3.org/2005/Atom', 'espi': 'http://naesb.org/espi'}
        
        # Extract timestamps and values
        times = [datetime.fromtimestamp(int(x.text)) for x in root.findall(
            "./atom:entry/atom:content/espi:IntervalBlock/espi:IntervalReading/espi:timePeriod/espi:start", namespace)]
        values = [float(x.text) for x in root.findall(
            "./atom:entry/atom:content/espi:IntervalBlock/espi:IntervalReading/espi:value", namespace)]
        
        # Build the DataFrame
        df = pd.DataFrame({"time": times, "kWh": values})
        df['kWh'] = df['kWh'] / 1_000_000  # Convert to kWh
        df['amps'] = df['kWh'] * 1000 / 240  # Convert kWh to amps (240V service)
        df = df[~df['time'].duplicated(keep='first')]
        df = df[df['time'].dt.minute == 0]
        df = df[df['time'].dt.second == 0]
        
        # Identify maximum values
        max_kWh = df['kWh'].max()
        max_kWh_time = df['time'][df['kWh'].idxmax()]
        max_amps = df['amps'].max()
        max_amps_time = df['time'][df['amps'].idxmax()]
        
        # Create an in-memory Excel file
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # Write data to sheet "hydro"
            df.to_excel(writer, sheet_name='hydro', index=False)
            workbook = writer.book
            
            # Plot 1: Demand vs. Time
            image_data1 = BytesIO()
            plt.figure(figsize=(12, 12))
            plt.plot(df['time'], df['kWh'], label='Demand')
            plt.scatter(max_kWh_time, max_kWh, color='red', label=f'Max Demand: {max_kWh:.2f} kWh at {max_kWh_time}')
            plt.xlabel('Time')
            plt.ylabel('Demand (kWh)')
            plt.title('Demand vs. Time')
            plt.legend()
            plt.grid(True)
            plt.savefig(image_data1, format='png')
            plt.close()
            image_data1.seek(0)
            
            # Plot 2: Amperage vs. Time
            image_data2 = BytesIO()
            plt.figure(figsize=(12, 12))
            plt.plot(df['time'], df['amps'], color='red', label='Amperage')
            plt.scatter(max_amps_time, max_amps, color='orange', label=f'Max Amps: {max_amps:.2f} A at {max_amps_time}')
            plt.xlabel('Time')
            plt.ylabel('Amperage (A)')
            plt.title('Amperage vs. Time')
            plt.legend()
            plt.grid(True)
            plt.savefig(image_data2, format='png')
            plt.close()
            image_data2.seek(0)
            
            # Create "plots" sheet and insert images
            worksheet_plots = workbook.add_worksheet('plots')
            worksheet_plots.insert_image('B2', 'Demand_vs_Time.png', {'image_data': image_data1})
            worksheet_plots.insert_image('B20', 'Amperage_vs_Time.png', {'image_data': image_data2})
        
        output.seek(0)
        output.name = "hydro.xlsx"
        return output
    except Exception as e:
        return f"An error occurred: {e}"

iface = gr.Interface(
    fn=process_xml,
    inputs=gr.components.File(label="Upload XML File"),
    outputs=gr.components.File(label="Download Excel File"),
    title="Hydro XML to Excel Converter",
    description="Upload your hydro XML file and receive an Excel file with processed data and graphs."
)

if __name__ == "__main__":
    iface.launch()
