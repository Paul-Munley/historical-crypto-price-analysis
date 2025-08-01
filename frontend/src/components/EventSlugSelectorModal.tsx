import { useState, useEffect, useContext } from 'react';
import {
  Box,
  Button,
  Modal,
  TextField,
  Select,
  MenuItem,
  Typography,
  Stack,
  CircularProgress,
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';

import Urls from '../constants/Urls';

import PageContext from "../PageContext";
import { ACTIONS } from '../PageProvider';

const LOCAL_STORAGE_KEY = 'submissionHistory';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  overflowY: 'auto',
  border: 1,
  borderColor: 'divider'
};

const EventSlugSelectorModal = ({ open, onClose }) => {
  const { state, dispatch } = useContext(PageContext);

  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState([]);
  const [currentlyPreviewedEvent, setCurrentlyPreviewedEvent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    setHistory(stored);
  }, []);

  const handleSubmit = () => {
    if (inputValue.trim() && currentlyPreviewedEvent) {
      const updatedHistory = [...new Set([inputValue, ...history])];
      setHistory(updatedHistory);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedHistory));

      dispatch({ type: ACTIONS.ADD_EVENT, payload: currentlyPreviewedEvent });
    }
    onClose();
  };

  const handleCancel = () => {
    setInputValue('');
    setCurrentlyPreviewedEvent(null);
    onClose();
  };

  const handleSelectChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleRequestPreview = async (slug) => {
    setPreviewLoading(true);
    try {
      const response = await fetch(Urls.EVENTS(slug));
      const eventsList = await response.json();

      if (eventsList.length !== 1) {
        throw new Error('Unexpected number of events returned');
      }

      setCurrentlyPreviewedEvent(eventsList[0]);
    } catch (err) {
      console.error('Failed to fetch preview:', err);
      setCurrentlyPreviewedEvent({ markets: [{ question: '❌ Could not fetch preview.' }] });
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleCancel}>
      <Box sx={style}>
        <Typography variant="h6" mb={2}>Add Event</Typography>

        <Stack spacing={2}>
          <Box display="flex" alignItems="stretch" gap={1}>
            <TextField
              label="Event slug"
              variant="outlined"
              fullWidth
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Button
              sx={{ minWidth: '85px' }}
              variant="outlined"
              onClick={() => handleRequestPreview(inputValue)}
              size="small"
              disabled={!inputValue.trim() || previewLoading}
            >
              {previewLoading ? <CircularProgress size={16} /> : 'Preview'}
            </Button>
          </Box>

          <Select
            displayEmpty
            value=""
            onChange={handleSelectChange}
            fullWidth
          >
            <MenuItem value="" disabled>Previous events</MenuItem>
            {history.map((item, index) => (
              <MenuItem
                key={index}
                value={item}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item}</Box>
                <Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(item);
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = history.filter((h) => h !== item);
                      setHistory(updated);
                      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </MenuItem>
            ))}
          </Select>

          <Box display="flex" justifyContent="space-between" gap={2}>
            <Button onClick={handleCancel} color="secondary" size="small">Cancel</Button>
            <Button variant="contained" onClick={handleSubmit} size="small">Submit</Button>
          </Box>

          {currentlyPreviewedEvent?.markets?.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Preview:</Typography>
              <Box
                sx={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {currentlyPreviewedEvent.markets.map((m, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      px: 2,
                      py: 1,
                      borderBottom: idx !== currentlyPreviewedEvent.markets.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    {m.question}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Stack>
      </Box>
    </Modal>
  );
};

export default EventSlugSelectorModal;
