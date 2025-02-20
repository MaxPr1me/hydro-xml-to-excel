# app.py
import pandas as pd
import matplotlib.pyplot as plt
from xml.etree import ElementTree
from datetime import datetime
from io import BytesIO
from PIL import Image
import gradio as gr

def process_xml(xml_file):
    try:
        # Check that the uploaded file is an XML file.
        if not xml_file.name.lower().endswith('.xml'):
            raise Exception("Wrong file type. Please upload an XML file.")
        
        # Parse the XML file.
        tree = ElementTree.parse(xml_file)
        root = tree.getroot()
        
        # Define XML namespaces.
        namespace = {
            'atom': 'http://www.w3.org/2005/Atom',
            'espi': 'http://naesb.org/espi'
        }
        
        # Extract timestamps and raw energy values.
        times = [datetime.fromtimestamp(int(x.text)) for x in root.findall(
            "./atom:entry/atom:content/espi:IntervalBlock/espi:IntervalReading/espi:timePeriod/espi:start",
            namespace)]
        raw_values = [float(x.text) for x in root.findall(
            "./atom:entry/atom:content/espi:IntervalBlock/espi:IntervalReading/espi:value",
            namespace)]
        
        if not times or not raw_values:
            raise Exception("No valid data found in the XML file.")
        
        # Create DataFrame.
        df = pd.DataFrame({"time": times, "raw_value": raw_values})
        
        # Remove duplicate timestamps.
        df = df[~df['time'].duplicated(keep='first')]
        
        # Check if there is at least one year of data.
        if (df['time'].max() - df['time'].min()).days < 365:
            raise Exception("Not enough data for analysis. At least one year of data is required.")
        
        # Determine the time interval between the first two readings (if available).
        if len(df) > 1:
            delta = (df['time'].iloc[1] - df['time'].iloc[0]).total_seconds()
        else:
            delta = None
        
        # Dynamically extract the powerOfTenMultiplier from the XML.
        multiplier_element = root.find(".//espi:ReadingType/espi:powerOfTenMultiplier", namespace)
        if multiplier_element is not None:
            multiplier_value = float(multiplier_element.text)
        else:
            multiplier_value = 0  # Default multiplier if not provided.
        
        # Compute the scaling factor.
        # The idea: raw_value * (10^(multiplier)) converts the raw value,
        # and then dividing by 1000 converts Wh to kWh.
        scale_factor = (10 ** multiplier_value) / 1000
        
        # Calculate kWh using the dynamic scale factor.
        df['kWh'] = df['raw_value'] * scale_factor
        
        # Calculate amps assuming a 240V electrical service.
        df['amps'] = df['kWh'] * 1000 / 240
        
        # For hourly data (3600 sec intervals) filter to include only timestamps exactly on the hour.
        if delta == 3600:
            df = df[df['time'].dt.minute == 0]
            df = df[df['time'].dt.second == 0]
        
        # Identify maximum values for highlighting in the plots.
        max_kWh = df['kWh'].max()
        max_kWh_time = df['time'][df['kWh'].idxmax()]
        max_amps = df['amps'].max()
        max_amps_time = df['time'][df['amps'].idxmax()]
        
        # ----- Plot 1: Demand vs. Time -----
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
        img1 = Image.open(image_data1)
        
        # ----- Plot 2: Amperage vs. Time -----
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
        img2 = Image.open(image_data2)
        
        return img1, img2
    
    except Exception as e:
        # Return the error message in both outputs.
        return str(e), str(e)

iface = gr.Interface(
    fn=process_xml,
    inputs=gr.File(label="Upload XML File"),
    outputs=[
        gr.Image(type="pil", label="Demand vs. Time Plot"),
        gr.Image(type="pil", label="Amperage vs. Time Plot")
    ],
    title="Hydro XML Plot Viewer",
    description=(
        "Upload your hydro XML file (must be an .xml file) to view the Demand vs. Time and "
        "Amperage vs. Time plots. The app dynamically adjusts the scaling based on the file's "
        "espi:powerOfTenMultiplier and time interval. Note: At least one year of data is required."
    )
)

iface.launch()