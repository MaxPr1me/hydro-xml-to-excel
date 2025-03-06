# app.py
import pandas as pd
import matplotlib.pyplot as plt
from xml.etree import ElementTree
from datetime import datetime, timedelta
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import gradio as gr

def create_error_image(message, width=600, height=400):
    """
    Create an image with the error message drawn on it.
    """
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except Exception:
        font = ImageFont.load_default()
    draw.text((10, 10), message, fill=(255, 0, 0), font=font)
    return img

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
        
        # Extract timezone offset (in seconds) from the XML, if available.
        tz_offset_element = root.find(".//espi:LocalTimeParameters/espi:tzOffset", namespace)
        tz_offset_seconds = int(tz_offset_element.text) if tz_offset_element is not None else 0
        tz_label = f"UTC{tz_offset_seconds/3600:+.0f}"
        
        # Extract timestamps and raw energy values.
        # Convert from UTC to local time using tz_offset_seconds.
        times = [datetime.utcfromtimestamp(int(x.text)) + timedelta(seconds=tz_offset_seconds)
                 for x in root.findall(
                     "./atom:entry/atom:content/espi:IntervalBlock/espi:IntervalReading/espi:timePeriod/espi:start",
                     namespace)]
        raw_values = [float(x.text) for x in root.findall(
            "./atom:entry/atom:content/espi:IntervalBlock/espi:IntervalReading/espi:value",
            namespace)]
        
        if not times or not raw_values:
            raise Exception("No valid data found in the XML file.")
        
        # Create a DataFrame.
        df = pd.DataFrame({"time": times, "raw_value": raw_values})
        df = df[~df['time'].duplicated(keep='first')]
        
        # Check if there is at least one year of data.
        if (df['time'].max() - df['time'].min()).days < 365:
            raise Exception("Not enough data for analysis. At least one year of data is required.")
        
        # Determine the time interval (delta in seconds) between the first two readings.
        if len(df) > 1:
            delta = (df['time'].iloc[1] - df['time'].iloc[0]).total_seconds()
        else:
            delta = 3600  # Default to hourly if only one point is available.
        
        # Raise an error if the timestep is larger than 1 hour.
        if delta > 3600:
            raise Exception(f"Data timestep is larger than 1 hour: {int(delta/60)} minutes.")
        
        # Determine a label for the timestep.
        if delta == 3600:
            timestep_text = "Hourly (60 min) data"
        elif delta == 900:
            timestep_text = "15-min data"
        else:
            timestep_text = f"{int(delta/60)} min data"
        
        # Dynamically extract the espi:powerOfTenMultiplier.
        multiplier_element = root.find(".//espi:ReadingType/espi:powerOfTenMultiplier", namespace)
        multiplier_value = float(multiplier_element.text) if multiplier_element is not None else 0
        
        # Compute the scaling factor.
        # If the multiplier is -6, assume the raw values are already in kWh.
        if multiplier_value == -6:
            scale_factor = 10 ** multiplier_value
        else:
            # Otherwise, assume raw_value is in Wh and convert to kWh by dividing by 1000.
            scale_factor = (10 ** multiplier_value) / 1000
        
        df['kWh'] = df['raw_value'] * scale_factor
        
        # Calculate amperage based on the time interval.
        # For an interval of delta seconds, the average power (in kW) is kWh / (delta/3600).
        # Then converting kW to W and dividing by 240V gives amps.
        df['amps'] = (df['kWh'] / (delta / 3600) * 1000) / 240
        
        # For hourly data (delta == 3600), filter to include only timestamps exactly on the hour.
        if delta == 3600:
            df = df[df['time'].dt.minute == 0]
            df = df[df['time'].dt.second == 0]
        
        # Identify maximum values for plotting.
        max_kWh = df['kWh'].max()
        max_kWh_time = df['time'][df['kWh'].idxmax()]
        max_amps = df['amps'].max()
        max_amps_time = df['time'][df['amps'].idxmax()]
        
        # ----- Plot 1: Demand vs. Time -----
        image_data1 = BytesIO()
        plt.figure(figsize=(10, 6))
        plt.plot(df['time'], df['kWh'], label='Demand')
        plt.scatter(max_kWh_time, max_kWh, color='red',
                    label=f'Max Demand: {max_kWh:.2f} kWh at {max_kWh_time} ({tz_label})')
        plt.xlabel(f"Time (Local, {tz_label})\nTimestep: {timestep_text}")
        plt.ylabel('Demand (kWh)')
        plt.title(f"Demand vs. Time - {timestep_text}")
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
                    label=f'Max Amps: {max_amps:.2f} A at {max_amps_time} ({tz_label})')
        plt.xlabel(f"Time (Local, {tz_label})\nTimestep: {timestep_text}")
        plt.ylabel('Amperage (A)')
        plt.title(f"Amperage vs. Time - {timestep_text}")
        plt.legend()
        plt.grid(True)
        plt.tight_layout()
        plt.savefig(image_data2, format='png')
        plt.close()
        image_data2.seek(0)
        img2 = Image.open(image_data2)
        
        return img1, img2
    
    except Exception as e:
        error_message = str(e)
        return create_error_image(error_message), create_error_image(error_message)

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
        "Amperage vs. Time plots. The app dynamically adjusts scaling based on the file's "
        "espi:powerOfTenMultiplier, converts timestamps using the provided tzOffset, and displays "
        "the data resolution. Note: Data timestep must be 1 hour or less and at least one year of data is required."
    )
)

iface.launch()
