import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCanvas } from '../../hooks/useCanvas';
import { Shape } from '../../types/canvas.types';
import toast from 'react-hot-toast';

interface LayerItemProps {
  shape: Shape;
  shapeNumber: number;
  onSelect: (shapeId: string, shiftKey: boolean) => void;
  onToggleVisibility: (shapeId: string) => void;
  onToggleLock: (shapeId: string) => void;
  onRename: (shapeId: string, newName: string) => void;
  isSelected: boolean;
}

function LayerItem({ shape, shapeNumber, onSelect, onToggleVisibility, onToggleLock, onRename, isSelected }: LayerItemProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: shape.id,
    disabled: shape.locked // Disable dragging if shape is locked
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // Smooth transition when not dragging
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
  };

  const getShapeIcon = (type: string) => {
    switch (type) {
      case 'rectangle': return '▭';
      case 'circle': return '●';
      case 'triangle': return '▲';
      case 'line': return '─';
      case 'text': return 'T';
      default: return '?';
    }
  };

  const getDefaultShapeName = (shape: Shape, number: number) => {
    const typeName = shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
    return `${typeName} ${number}`;
  };

  const displayName = (shape as any).name || getDefaultShapeName(shape, shapeNumber);

  const handleNameDoubleClick = () => {
    if (!shape.locked) {
      setIsEditingName(true);
      setEditedName(displayName);
    }
  };

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (editedName.trim() && editedName !== displayName) {
      onRename(shape.id, editedName.trim());
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName('');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center gap-3 p-3 bg-white rounded-lg mb-2 border-2 transition-all duration-200 ${
        isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'
      } ${shape.locked ? 'opacity-60' : ''} ${isDragging ? 'shadow-2xl scale-105 rotate-2 z-50' : ''}`}
    >
      {/* Left draggable area - Drag Handle + Icon + Name */}
      <div 
        {...listeners}
        className={`flex items-center gap-3 flex-1 min-w-0 ${shape.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
        title={shape.locked ? 'Unlock to reorder' : 'Drag to reorder • Double-click to select • Shift+Double-click for multi-select'}
        onDoubleClick={(e) => {
          // Only handle double-click if not dragging and not editing name
          if (!isDragging && !isEditingName) {
            onSelect(shape.id, e.shiftKey);
          }
        }}
      >
        {/* Drag Handle */}
        <div className={`text-gray-400 text-sm flex-shrink-0 ${shape.locked ? 'opacity-30' : ''}`}>
          ⋮⋮
        </div>

        {/* Shape Icon with color preview */}
        <div 
          className="w-10 h-10 border-2 border-gray-300 rounded-md flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-sm"
          style={{ 
            backgroundColor: shape.color,
            opacity: shape.opacity || 1
          }}
        >
          <span style={{ 
            color: shape.color === '#FFFFFF' || shape.color === '#ffffff' ? '#000' : '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            {getShapeIcon(shape.type)}
          </span>
        </div>

        {/* Shape Name - Editable */}
        {isEditingName ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-medium px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span 
            className="flex-1 text-sm font-medium truncate"
            onDoubleClick={handleNameDoubleClick}
            title={`Double-click to rename • Z-index: ${shape.zIndex}`}
          >
            {displayName}
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Visibility Toggle */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleVisibility(shape.id);
          }}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded transition-colors text-xl"
          title={shape.visible !== false ? 'Hide shape' : 'Show shape'}
        >
          {shape.visible !== false ? '👁' : '🙈'}
        </button>

        {/* Lock Toggle */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleLock(shape.id);
          }}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded transition-colors text-xl"
          title={shape.locked ? 'Unlock to edit' : 'Lock to prevent changes'}
        >
          {shape.locked ? '🔒' : '🚪'}
        </button>
      </div>
    </div>
  );
}

export function LayersPanel() {
  const { rectangles, selectedIds, selectShape, deselectAll, toggleSelection, updateShape, batchSetZIndex } = useCanvas();
  
  // Sort by z-index (highest first = frontmost)
  const sortedShapes = [...rectangles].sort((a, b) => b.zIndex - a.zIndex);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require 5px movement before drag starts (smoother drag experience)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedShapes.findIndex(shape => shape.id === active.id);
      const newIndex = sortedShapes.findIndex(shape => shape.id === over.id);
      
      const reorderedShapes = arrayMove(sortedShapes, oldIndex, newIndex);
      
      // Calculate all z-index updates (highest index = highest z-index = frontmost)
      const zIndexUpdates: Record<string, number> = {};
      reorderedShapes.forEach((shape, index) => {
        const newZIndex = reorderedShapes.length - index;
        if (shape.zIndex !== newZIndex) {
          zIndexUpdates[shape.id] = newZIndex;
        }
      });
      
      // Batch update all z-indices with optimistic local updates
      if (Object.keys(zIndexUpdates).length > 0) {
        try {
          await batchSetZIndex(zIndexUpdates);
          toast.success('Layer order updated');
        } catch (error) {
          console.error('Failed to update layer order:', error);
          toast.error('Failed to update layer order');
        }
      }
    }
  };

  const handleSelect = (shapeId: string, shiftKey: boolean) => {
    if (shiftKey) {
      // Shift+double-click: toggle this shape in/out of selection (multi-select)
      toggleSelection(shapeId);
    } else {
      // Regular double-click logic:
      const isCurrentlySelected = selectedIds.includes(shapeId);
      
      if (isCurrentlySelected) {
        // Shape is already selected - unselect it
        if (selectedIds.length === 1) {
          // Last selected shape - deselect all (layers panel will close)
          deselectAll();
        } else {
          // Multiple shapes selected - just unselect this one (keep layers panel open)
          toggleSelection(shapeId); // This removes it from selection
        }
      } else {
        // Shape is not selected - select only this shape (replacing current selection)
        selectShape(shapeId);
      }
    }
  };

  const handleToggleVisibility = (shapeId: string) => {
    const shape = rectangles.find(s => s.id === shapeId);
    if (shape) {
      updateShape(shapeId, { visible: shape.visible === false ? true : false });
    }
  };

  const handleToggleLock = (shapeId: string) => {
    const shape = rectangles.find(s => s.id === shapeId);
    if (shape) {
      updateShape(shapeId, { locked: !shape.locked });
    }
  };

  const handleRename = (shapeId: string, newName: string) => {
    updateShape(shapeId, { name: newName });
    toast.success(`Renamed to "${newName}"`);
  };

  // Calculate shape numbers (count from 1, by type)
  const shapeNumbers: Record<string, number> = {};
  const shapeCounts: Record<string, number> = {};
  
  // First pass: count total shapes by type
  rectangles.forEach(shape => {
    shapeCounts[shape.type] = (shapeCounts[shape.type] || 0) + 1;
  });
  
  // Second pass: assign numbers based on z-index order (front to back)
  sortedShapes.forEach((shape, index) => {
    // const typeCount = shapeCounts[shape.type] || 1; // Not currently used
    const numberInType = sortedShapes
      .slice(0, index + 1)
      .filter(s => s.type === shape.type).length;
    shapeNumbers[shape.id] = numberInType;
  });

  return (
    <div className="w-80 bg-gradient-to-b from-gray-50 to-white border-l border-gray-200 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">📚</span>
          Layers
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {rectangles.length} {rectangles.length === 1 ? 'shape' : 'shapes'} • Drag to reorder
        </p>
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 leading-relaxed">
          <div>💡 Double-click to select/unselect</div>
          <div className="mt-0.5">Double-click name to rename</div>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-4">
        {rectangles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <p className="text-sm text-gray-500 font-medium">No shapes on canvas</p>
            <p className="text-xs text-gray-400 mt-2">Create shapes to see them here</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedShapes.map(shape => shape.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedShapes.map((shape) => (
                <LayerItem
                  key={shape.id}
                  shape={shape}
                  shapeNumber={shapeNumbers[shape.id] || 1}
                  onSelect={handleSelect}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
                  onRename={handleRename}
                  isSelected={selectedIds.includes(shape.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
