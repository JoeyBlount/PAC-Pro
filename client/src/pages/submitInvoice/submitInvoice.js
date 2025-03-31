import { Container } from "@mui/material";
import "./submitInvoice.css";
import { storage } from "../../config/firebase-config"; // Import initialized Firebase storage
import { v4 } from "uuid"; // UUID for unique image names
import { useState, useEffect } from "react";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
} from "firebase/storage";

const SubmitInvoice = () => {
  const [imageUpload, setImageUpload] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);

  const imagesListRef = ref(storage, "images/");

  const uploadFile = async () => {
    if (!imageUpload) {
      alert("Please select a file before uploading.");
      return;
    }
  
    try {
      const imageRef = ref(storage, `images/${imageUpload.name + v4()}`);
      const snapshot = await uploadBytes(imageRef, imageUpload);
      const url = await getDownloadURL(snapshot.ref);
      
      setImageUrls((prev) => [...prev, url]);
      
      alert("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed, please try again.");
    }
  };
  

 
  useEffect(() => {
    document.title = "PAC Pro - Submit Invoice";
  }, []); // Used to change title

  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
      <h1 className="Header">Submit Invoice</h1>
      <h3> Upload image of invoice </h3>
      <div>
        {/* File input for selecting an image */}
        <input
          type="file"
          onChange={(event) => setImageUpload(event.target.files[0])}
        />
        {/* Upload button */}
        <button onClick={uploadFile}> Upload Image</button>
        {/* Display uploaded images */}
        <div>
          {imageUrls.map((url, index) => (
            <img key={index} src={url} alt="Uploaded Invoice" width="200px" />
          ))}
        </div>
      </div>
    </Container>
  );
};

export default SubmitInvoice;
