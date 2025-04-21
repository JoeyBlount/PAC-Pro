import React, { useEffect, useState } from "react";
import { Box, TextField, IconButton, Tooltip, Stack, Paper } from '@mui/material';
import { Send, RemoveCircleOutline } from '@mui/icons-material';
//import { StoreContext } from "../../context/storeContext"; // Save for future

const Notepad = () => {
  //const { selectedStore } = useContext(StoreContext);  // Save for future

  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState('');

  // Load saved notes on mount. In the future this would fetch from database based on selected store.
  useEffect(() => {
    const savedNotes = localStorage.getItem('savedNotes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Update saved notes. In the future, this would update the database. 
  useEffect(() => {
    localStorage.setItem('savedNotes', JSON.stringify(notes));
  }, [notes])
  
  const addNote = () => {
    if (body.trim()) {
      const newNote = {
        id: Date.now(),
        body
      };

      setNotes([newNote, ...notes]);
      setBody('');
    }
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const handleButtonClick = () => {
    addNote();
  }

  return (
    <Box sx={{ width: "inherit", minHeight: "inherit" }}>
      <Stack direction="column" spacing={1}>
        <Stack direction="row" spacing={1}>
          <TextField fullWidth id="" label="New note" variant="outlined" 
              size="small" value={body} 
              onChange= {(e) => setBody(e.target.value)} />
          <Tooltip title="Add New Note">
            <IconButton onClick={() => {handleButtonClick()}}>
              <Send />
            </IconButton>
          </Tooltip>
        </Stack>
        <Box>
          <Stack direction="column" spacing={1} sx={{overflow:"hidden", overflowY: "auto", height: "25vh"}}>
            {
              notes.length === 0 
                ? (<Box>No notes added</Box>) 
                : (notes.map(note => (
                  <Stack direction="row" alignItems={"center"} sx={{height: "auto"}}>
                    <IconButton onClick={() => deleteNote(note.id)}> <RemoveCircleOutline /> </IconButton>
                    <Paper elevation={6} sx={{padding: 1, width: "55vh", wordBreak: "break-word"}}>{note.body}</Paper>
                  </Stack>)))
            }
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default Notepad;