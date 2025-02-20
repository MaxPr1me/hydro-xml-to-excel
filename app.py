# app.py
import pandas as pd
import matplotlib.pyplot as plt
from xml.etree import ElementTree
from datetime import datetime
from io import BytesIO
from PIL import Image  # Import PIL to convert BytesIO to PIL Image
import gradio as gr

def process_xml(xml_file):
    """
    Process the uploaded XML file and produce two plots:
    - Demand vs. Time
    - Amperage vs. Time

    The function extracts timestamps and values from the XML,
    converts them into kWh and amps, and generates plots.
    """
    try:
        # Parse the XML file
        tree = ElementTree.parse(xml_file)
        root = tree.getroot()
        
        # Define XML namespaces
        namespace = {
            'atom': 'http://www.w3.org/2005/Atom',
            'espi': 'http://naesb.org/espi'
        }
        
        # Extract timestamps and values from the XML file
        times = [datetime.fromtimestamp(int(x.text)) 
                 for x in root.findall(
                    "./atom:entry/atom:content/espi:IntervalBlock/espi:IntervalReading/espi:timePeriod/espi:start", 
                    namespace)]
        values = [float(x.text) 
                  for x in root.findall(
                    "./atom:entry/atom:content/espi:IntervalBlock/espi:IntervalReading/espi:value", 
                    namespace)]
        
        # Create a DataFrame from the extracted data
        df = pd.DataFrame({"time": times, "kWh": values})
        df['kWh'] = df['kWh'] / 1_000_000  # Convert raw values to kWh
        df['amps'] = df['kWh'] * 1000 / 240  # Convert kWh to amps (assuming 240V service)
        
        # Remove duplicate timestamps and keep rows with times exactly on the hour
        df = df[~df['time'].duplicated(keep='first')]
        df = df[df['time'].dt.minute == 0]
        df = df[df['time'].dt.second == 0]
        
        # Identify maximum values and their corresponding times
        max_kWh = df['kWh'].max()
        max_kWh_time = df['time'][df['kWh'].idxmax()]
        max_amps = df['amps'].max()
        max_amps_time = df['time'][df['amps'].idxmax()]
        
        # ----- Create the first plot: Demand vs. Time -----
        image_data1 = BytesIO()
        plt.figure(figsize=(10, 6))
        plt.plot(df['time'], df['kWh'], label='Demand')
        plt.scatter(max_kWh_time, max_kWh, color='red', 
                    label=f'Max Demand: {max_kWh:.2f} kWh at {max_kWh_time}')
        plt.xlabel('Time')
        plt.ylabel('Demand (kWh)')
        plt.title('Demand vs. Time')
        plt.legend()
        plt.grid(True)
        plt.tight_layout()
        plt.savefig(image_data1, format='png')
        plt.close()
        image_data1.seek(0)
        img1 = Image.open(image_data1)  # Convert BytesIO to PIL image
        
        # ----- Create the second plot: Amperage vs. Time -----
        image_data2 = BytesIO()
        plt.figure(figsize=(10, 6))
        plt.plot(df['time'], df['amps'], color='red', label='Amperage')
        plt.scatter(max_amps_time, max_amps, color='orange', 
                    label=f'Max Amps: {max_amps:.2f} A at {max_amps_time}')
        plt.xlabel('Time')
        plt.ylabel('Amperage (A)')
        plt.title('Amperage vs. Time')
        plt.legend()
        plt.grid(True)
        plt.tight_layout()
        plt.savefig(image_data2, format='png')
        plt.close()
        image_data2.seek(0)
        img2 = Image.open(image_data2)  # Convert BytesIO to PIL image
        
        # Return the two PIL images
        return img1, img2
    except Exception as e:
        return str(e)

# Create a Gradio interface with two image outputs
iface = gr.Interface(
    fn=process_xml,
    inputs=gr.File(label="Upload XML File"),
    outputs=[
        gr.Image(type="pil", label="Demand vs. Time Plot"),
        gr.Image(type="pil", label="Amperage vs. Time Plot")
    ],
    title="Hydro XML Plot Viewer",
    description="Upload your hydro XML file to view the Demand vs. Time and Amperage vs. Time plots."
)

iface.launch()