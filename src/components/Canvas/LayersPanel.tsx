import React from 'react';
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

interface LayerItemProps {
  shape: Shape;
  onSelect: (shapeId: string) => void;
  onToggleVisibility: (shapeId: string) => void;
  onToggleLock: (shapeId: string) => void;
  isSelected: boolean;
}

function LayerItem({ shape, onSelect, onToggleVisibility, onToggleLock, isSelected }: LayerItemProps) {
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
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getShapeIcon = (type: string) => {
    switch (type) {
      case 'rectangle': return '⬜';
      case 'circle': return '⚫';
      case 'triangle': return '▲';
      case 'line': return '─';
      case 'text': return 'T';
      default: return '?';
    }
  };

  const getShapeName = (shape: Shape) => {
    const typeName = shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
    const shortId = shape.id.slice(-4);
    return `${typeName} ${shortId}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center gap-2 p-2 bg-white rounded mb-1 border ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      } ${shape.locked ? 'opacity-60' : 'hover:bg-gray-100 cursor-grab active:cursor-grabbing'}`}
      onClick={(e) => {
        // Only handle click if not dragging
        if (!isDragging) {
          if (isSelected) {
            // If already selected, deselect it
            onSelect(''); // Pass empty string to deselect
          } else {
            // If not selected, select it
            onSelect(shape.id);
          }
        }
      }}
    >
      {/* Drag Handle - only apply drag listeners to handle, not entire row */}
      <div 
        {...listeners}
        className={`text-gray-400 text-xs flex-shrink-0 ${shape.locked ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing'}`}
        title={shape.locked ? 'Unlock to reorder' : 'Drag to reorder'}
      >
        ⋮⋮
      </div>

      {/* Shape Icon */}
      <div 
        className="w-8 h-8 border rounded flex items-center justify-center text-sm"
        style={{ 
          backgroundColor: shape.color,
          opacity: shape.opacity || 1
        }}
      >
        {getShapeIcon(shape.type)}
      </div>

      {/* Shape Name */}
      <span className="flex-1 text-sm truncate">
        {getShapeName(shape)}
      </span>

      {/* Visibility Toggle */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleVisibility(shape.id);
        }}
        className="text-gray-600 hover:text-gray-800 p-1 text-xl cursor-pointer"
        title={shape.visible !== false ? 'Hide' : 'Show'}
      >
        {shape.visible !== false ? '👁' : '🚫'}
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
        className="text-gray-600 hover:text-gray-800 p-1 text-xl cursor-pointer"
        title={shape.locked ? 'Unlock' : 'Lock'}
      >
        {shape.locked ? '🔐' : '🔓'}
      </button>
    </div>
  );
}

export function LayersPanel() {
  const { rectangles, selectedIds, selectShape, updateShape } = useCanvas();
  
  // Sort by z-index (highest first = frontmost)
  const sortedShapes = [...rectangles].sort((a, b) => b.zIndex - a.zIndex);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedShapes.findIndex(shape => shape.id === active.id);
      const newIndex = sortedShapes.findIndex(shape => shape.id === over.id);
      
      const reorderedShapes = arrayMove(sortedShapes, oldIndex, newIndex);
      
      // Update z-index for all shapes based on new order
      reorderedShapes.forEach((shape, index) => {
        const newZIndex = reorderedShapes.length - index; // Higher index = higher z-index
        if (shape.zIndex !== newZIndex) {
          updateShape(shape.id, { zIndex: newZIndex });
        }
      });
    }
  };

  const handleSelect = (shapeId: string) => {
    if (shapeId === '') {
      // Deselect all shapes
      selectedIds.forEach(id => selectShape(id)); // This will deselect each selected shape
    } else {
      selectShape(shapeId);
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

  return (
    <div className="w-60 bg-gray-50 border-l p-4 h-full overflow-y-auto">
      <h3 className="font-semibold mb-3 text-gray-700">Layers</h3>
      
      {rectangles.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No shapes on canvas
        </p>
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
                onSelect={handleSelect}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                isSelected={selectedIds.includes(shape.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
