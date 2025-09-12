#!/usr/bin/env python3
"""
Simple test script to verify the PAC backend server
"""
import requests
import time
import sys

def test_server():
    """Test if the server is running and responding"""
    base_url = "http://localhost:5140"
    
    print("🧪 Testing PAC Backend Server...")
    print(f"🌐 Testing URL: {base_url}")
    
    try:
        # Test root endpoint
        print("\n1. Testing root endpoint...")
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print("✅ Root endpoint working")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            
        # Test health endpoint
        print("\n2. Testing health endpoint...")
        response = requests.get(f"{base_url}/api/pac/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working")
            health_data = response.json()
            print(f"   Status: {health_data.get('status')}")
            print(f"   Platform: {health_data.get('platform', {}).get('system')} {health_data.get('platform', {}).get('architecture')}")
            print(f"   Firebase: {health_data.get('firebase', {}).get('mode', 'unknown')}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            
        # Test PAC data endpoint (mock)
        print("\n3. Testing PAC data endpoint...")
        response = requests.get(f"{base_url}/api/pac/store_001/202501", timeout=5)
        if response.status_code == 200:
            print("✅ PAC data endpoint working")
            pac_data = response.json()
            print(f"   Entity: {pac_data.get('data', {}).get('entity_id')}")
            print(f"   Month: {pac_data.get('data', {}).get('year_month')}")
            print(f"   Mode: {pac_data.get('message', '')}")
        else:
            print(f"❌ PAC data endpoint failed: {response.status_code}")
            
        print("\n🎉 All tests passed! Server is working correctly.")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running on port 5140?")
        print("   Try running: python main.py")
        return False
    except requests.exceptions.Timeout:
        print("❌ Server request timed out")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_server()
    sys.exit(0 if success else 1)
