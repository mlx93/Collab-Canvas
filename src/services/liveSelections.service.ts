// Live Selections Service - Real-time selection visibility across users
import { rtdb } from './firebase';
import { ref, set, remove, onValue, off } from 'firebase/database';

export interface LiveSelection {
  userId: string;
  userEmail: string;
  userName: string;
  selectionType: 'drag-select' | 'multi-select';
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
  selectedIds?: string[]; // For multi-select
}

export interface LiveSelections {
  [userId: string]: LiveSelection;
}

// Set live selection (drag-select region or multi-select indicator)
export const setLiveSelection = (
  userId: string,
  userEmail: string,
  userName: string,
  selectionType: 'drag-select' | 'multi-select',
  x: number,
  y: number,
  width: number,
  height: number,
  selectedIds?: string[]
) => {
  const selectionRef = ref(rtdb, `liveSelections/${userId}`);
  
  const liveSelection: LiveSelection = {
    userId,
    userEmail,
    userName,
    selectionType,
    x,
    y,
    width,
    height,
    timestamp: Date.now(),
    selectedIds: selectedIds?.filter(id => id !== undefined && id !== null) || []
  };

  set(selectionRef, liveSelection).catch((error: any) => {
    console.error('Failed to set live selection:', error);
  });
};

// Clear live selection
export const clearLiveSelection = (userId: string) => {
  const selectionRef = ref(rtdb, `liveSelections/${userId}`);
  remove(selectionRef).catch((error: any) => {
    console.error('Failed to clear live selection:', error);
  });
};

// Subscribe to live selections
export const subscribeToLiveSelections = (callback: (selections: LiveSelections) => void) => {
  const selectionsRef = ref(rtdb, 'liveSelections');
  
  const handleValueChange = (snapshot: any) => {
    const selections = snapshot.val() as LiveSelections || {};
    
    // Filter out expired selections (older than 5 seconds)
    const now = Date.now();
    const filteredSelections: LiveSelections = {};
    
    Object.entries(selections).forEach(([userId, selection]) => {
      if (now - selection.timestamp < 5000) {
        filteredSelections[userId] = selection;
      }
    });
    
    callback(filteredSelections);
  };

  onValue(selectionsRef, handleValueChange);

  // Return unsubscribe function
  return () => {
    off(selectionsRef, 'value', handleValueChange);
  };
};
