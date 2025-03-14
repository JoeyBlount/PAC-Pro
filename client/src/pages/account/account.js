import React from "react";
import { Container, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { db } from "./config/firebase";
import { getDocs, collection } from 'firebase/firestore';

const Account = () => {
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
 
    return (
    <Container sx={{ textAlign: "center", marginTop: 10 }}>
      <Typography variant="h3">Account Information</Typography>
      <div> 
        {userList.map((user) => (
            <div>
            <p> Account: {user.fname} {user.lname}</p>
            <p> Email: {user.email} </p>
            <p> Role: {user.role} </p>
            </div>
        ))

        }
      </div>
    </Container>
  );
};

export default Account;