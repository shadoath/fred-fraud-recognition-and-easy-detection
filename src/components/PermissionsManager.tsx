import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  IconButton,
  Divider,
  Card,
  CardContent,
  CardActions,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SecurityIcon from "@mui/icons-material/Security";

import { hasHostPermission, requestHostPermission, requestPermissionWithPrompt, removeHostPermission, getGrantedHostPermissions } from "../lib/permissionsService";

/**
 * Component for managing URL permissions
 */
const PermissionsManager: React.FC = () => {
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [deletePermUrl, setDeletePermUrl] = useState("");
  
  // Load permissions when component mounts
  useEffect(() => {
    loadPermissions();
  }, []);
  
  // Function to load permissions from Chrome storage
  const loadPermissions = async () => {
    setLoading(true);
    try {
      const permissions = await getGrantedHostPermissions();
      setGrantedPermissions(permissions);
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to request a new URL permission
  const handleAddPermission = async () => {
    // Validate URL
    let url = newUrl.trim();
    
    // Add https:// if not present
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      setUrlError("Please enter a valid URL");
      return;
    }
    
    // Clear error if valid
    setUrlError("");
    
    // Request permission
    try {
      const granted = await requestPermissionWithPrompt(url, "fraud analysis");
      
      if (granted) {
        setNewUrl("");
        loadPermissions(); // Reload the permissions list
      } else {
        setUrlError("Permission request was denied");
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      setUrlError("Error requesting permission");
    }
  };
  
  // Function to remove a permission
  const handleRemovePermission = async () => {
    try {
      const success = await removeHostPermission(deletePermUrl);
      
      if (success) {
        loadPermissions(); // Reload the permissions list
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error("Error removing permission:", error);
    }
  };
  
  // Dialog handlers
  const handleOpenDialog = (url: string) => {
    setDeletePermUrl(url);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDeletePermUrl("");
  };
  
  // Get domain name from URL for display
  const getDomainFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url.replace(/^https?:\/\//, "").replace(/\/\*$/, "");
    }
  };
  
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <SecurityIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" component="h2">
            Site Permissions
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          FRED needs permission to read content from websites in order to analyze text for fraud. 
          Permissions are granted per site and can be revoked at any time.
        </Alert>
        
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
          Add New Permission
        </Typography>
        
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <TextField
            label="Website URL"
            variant="outlined"
            size="small"
            fullWidth
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Enter website URL (e.g., mail.google.com)"
            error={!!urlError}
            helperText={urlError}
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddPermission}
            disabled={!newUrl.trim()}
          >
            Add
          </Button>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
          Current Permissions
        </Typography>
        
        {loading ? (
          <Typography variant="body2">Loading permissions...</Typography>
        ) : grantedPermissions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No website permissions granted yet. Add sites above to analyze content from those domains.
          </Typography>
        ) : (
          <List dense>
            {grantedPermissions.map((permission) => (
              <ListItem
                key={permission}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleOpenDialog(permission)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={getDomainFromUrl(permission)}
                  secondary={permission}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Remove site permission?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to remove permission for {deletePermUrl ? getDomainFromUrl(deletePermUrl) : "this site"}? 
            You will need to grant permission again to analyze content from this site in the future.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleRemovePermission} color="error" autoFocus>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PermissionsManager;