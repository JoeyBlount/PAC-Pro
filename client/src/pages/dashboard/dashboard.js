import React from "react";
import { Container, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { db } from "../../config/firebase-config";
import { getDocs, collection } from 'firebase/firestore';

const Dashboard = () => {
  // accessing database, remove later
  const [userList, setUserList] = useState ([]);
  const usersCollectionRef = collection(db, "users");
  
    useEffect (() => {
      const getUserList = async () => {
          try{
              const data = await getDocs(usersCollectionRef);
              const filteredData = data.docs.map((doc) => ({
                  ...doc.data(),
                  id: doc.id,
              }));
              setUserList(filteredData);
          } catch (err){
              console.error(err); 
          }
      };
  
      getUserList();
    }, [])
  // end of database accessing
   
  return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
       <h1 className="Header">Welcome to the Dashboard!</h1>

     
    </Container>
          
   
  );
};

export default Dashboard;