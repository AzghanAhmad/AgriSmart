"""
Test script to verify static file serving works correctly
Run: python test_static_file.py
"""
import requests
import os

# Test image file
test_file = 'static/uploads/timelapse/timelapse_566f90edc1f2.jpg'
base_url = 'http://172.20.10.3:5000'

if not os.path.exists(test_file):
    print(f"❌ Test file not found: {test_file}")
    exit(1)

file_size = os.path.getsize(test_file)
print(f"📁 Test file: {test_file}")
print(f"   Size: {file_size} bytes")
print(f"\n🌐 Testing URL: {base_url}/static/uploads/timelapse/timelapse_566f90edc1f2.jpg")

try:
    response = requests.get(
        f"{base_url}/static/uploads/timelapse/timelapse_566f90edc1f2.jpg",
        timeout=10,
        stream=True
    )
    
    print(f"\n📊 Response Status: {response.status_code}")
    print(f"   Content-Type: {response.headers.get('Content-Type', 'N/A')}")
    print(f"   Content-Length: {response.headers.get('Content-Length', 'N/A')}")
    print(f"   Accept-Ranges: {response.headers.get('Accept-Ranges', 'N/A')}")
    print(f"   Cache-Control: {response.headers.get('Cache-Control', 'N/A')}")
    print(f"   Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin', 'N/A')}")
    
    if response.status_code == 200:
        # Read the response
        received_data = response.content
        received_size = len(received_data)
        
        print(f"\n✅ Request Successful!")
        print(f"   Expected size: {file_size} bytes")
        print(f"   Received size: {received_size} bytes")
        
        if received_size == file_size:
            print(f"   ✅ File size matches! Image should load correctly.")
        else:
            print(f"   ⚠️  Size mismatch! File may be corrupted or incomplete.")
            print(f"   Difference: {abs(file_size - received_size)} bytes")
        
        # Check if it's a valid image
        if received_data[:2] == b'\xff\xd8':  # JPEG magic bytes
            print(f"   ✅ Valid JPEG file (starts with JPEG magic bytes)")
        else:
            print(f"   ⚠️  File doesn't start with JPEG magic bytes")
            print(f"   First 20 bytes: {received_data[:20]}")
    else:
        print(f"\n❌ Request Failed!")
        print(f"   Response: {response.text[:200]}")
        
except requests.exceptions.ConnectionError:
    print(f"\n❌ Connection Error!")
    print(f"   Cannot connect to {base_url}")
    print(f"   Make sure Flask server is running: python app.py")
except requests.exceptions.Timeout:
    print(f"\n❌ Request Timeout!")
    print(f"   Server took too long to respond")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

