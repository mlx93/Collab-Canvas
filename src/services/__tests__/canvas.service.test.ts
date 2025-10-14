// Unit tests for canvas.service.ts
import {
  createRectangle,
  updateRectangle,
  updateZIndex,
  deleteRectangle,
  subscribeToShapes,
} from '../canvas.service';
import { Rectangle } from '../../types/canvas.types';
import { CANVAS_ID } from '../../utils/constants';

// Mock Firestore
jest.mock('../firebase', () => ({
  db: {},
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

import * as firestore from 'firebase/firestore';
import toast from 'react-hot-toast';

describe('canvas.service', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('createRectangle', () => {
    it('should create a rectangle in Firestore with correct data structure', async () => {
      const mockSetDoc = firestore.setDoc as jest.Mock;
      mockSetDoc.mockResolvedValue(undefined);

      const mockDoc = { id: 'test-id' };
      (firestore.doc as jest.Mock).mockReturnValue(mockDoc);
      (firestore.collection as jest.Mock).mockReturnValue({});

      const rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'> = {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        color: '#2196F3',
        createdBy: 'test@example.com',
        lastModifiedBy: 'test@example.com',
      };

      await createRectangle(rectangle);

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          color: '#2196F3',
          zIndex: 1,
          createdBy: 'test@example.com',
        })
      );
    });

    it('should use canvas ID "default-canvas"', async () => {
      const mockSetDoc = firestore.setDoc as jest.Mock;
      mockSetDoc.mockResolvedValue(undefined);

      const mockCollection = jest.fn();
      (firestore.collection as jest.Mock).mockImplementation(mockCollection);
      (firestore.doc as jest.Mock).mockReturnValue({ id: 'test-id' });

      const rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'> = {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        color: '#2196F3',
        createdBy: 'test@example.com',
        lastModifiedBy: 'test@example.com',
      };

      await createRectangle(rectangle);

      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        `canvases/${CANVAS_ID}/shapes`
      );
    });

    it('should retry on failure with exponential backoff', async () => {
      const mockSetDoc = firestore.setDoc as jest.Mock;
      mockSetDoc
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      (firestore.doc as jest.Mock).mockReturnValue({ id: 'test-id' });
      (firestore.collection as jest.Mock).mockReturnValue({});

      const rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'> = {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        color: '#2196F3',
        createdBy: 'test@example.com',
        lastModifiedBy: 'test@example.com',
      };

      await createRectangle(rectangle);

      expect(mockSetDoc).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should show error toast after all retries fail', async () => {
      const mockSetDoc = firestore.setDoc as jest.Mock;
      mockSetDoc.mockRejectedValue(new Error('Network error'));

      (firestore.doc as jest.Mock).mockReturnValue({ id: 'test-id' });
      (firestore.collection as jest.Mock).mockReturnValue({});

      const rectangle: Omit<Rectangle, 'id' | 'zIndex' | 'createdAt' | 'lastModified'> = {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        color: '#2196F3',
        createdBy: 'test@example.com',
        lastModifiedBy: 'test@example.com',
      };

      await expect(createRectangle(rectangle)).rejects.toThrow('Network error');
      expect(mockSetDoc).toHaveBeenCalledTimes(3); // MAX_RETRIES
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to')
      );
    });
  });

  describe('updateRectangle', () => {
    it('should update rectangle with correct data', async () => {
      const mockUpdateDoc = firestore.updateDoc as jest.Mock;
      mockUpdateDoc.mockResolvedValue(undefined);

      (firestore.doc as jest.Mock).mockReturnValue({});

      await updateRectangle('test-id', { x: 200, y: 200 });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          x: 200,
          y: 200,
          zIndex: 1, // Auto-set to 1 on edit
        })
      );
    });

    it('should auto-set z-index to 1 on position/size/color update', async () => {
      const mockUpdateDoc = firestore.updateDoc as jest.Mock;
      mockUpdateDoc.mockResolvedValue(undefined);

      (firestore.doc as jest.Mock).mockReturnValue({});

      await updateRectangle('test-id', { color: '#FF0000' });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          color: '#FF0000',
          zIndex: 1,
        })
      );
    });
  });

  describe('updateZIndex', () => {
    it('should perform batch update for z-index recalculation', async () => {
      const mockGetDocs = firestore.getDocs as jest.Mock;
      const mockWriteBatch = firestore.writeBatch as jest.Mock;
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      const mockBatchUpdate = jest.fn();

      mockWriteBatch.mockReturnValue({
        commit: mockBatchCommit,
        update: mockBatchUpdate,
      });

      mockGetDocs.mockResolvedValue({
        forEach: (callback: Function) => {
          const shapes = [
            { id: 'shape-1', zIndex: 1 },
            { id: 'shape-2', zIndex: 2 },
            { id: 'shape-3', zIndex: 3 },
          ];
          shapes.forEach((data) => callback({ data: () => data }));
        },
      });

      (firestore.query as jest.Mock).mockReturnValue({});
      (firestore.collection as jest.Mock).mockReturnValue({});
      (firestore.doc as jest.Mock).mockReturnValue({});

      await updateZIndex('shape-3', 1);

      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('deleteRectangle', () => {
    it('should delete rectangle from Firestore', async () => {
      const mockDeleteDoc = firestore.deleteDoc as jest.Mock;
      mockDeleteDoc.mockResolvedValue(undefined);

      (firestore.doc as jest.Mock).mockReturnValue({});

      await deleteRectangle('test-id');

      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeToShapes', () => {
    it('should subscribe to shapes and call callback with sorted data', () => {
      const mockUnsubscribe = jest.fn();
      const mockCallback = jest.fn();

      (firestore.onSnapshot as jest.Mock).mockImplementation((query, callback) => {
        // Simulate Firestore snapshot
        callback({
          forEach: (fn: Function) => {
            const shapes = [
              {
                id: 'shape-1',
                data: () => ({
                  x: 100,
                  y: 100,
                  width: 100,
                  height: 100,
                  color: '#2196F3',
                  zIndex: 2,
                  createdBy: 'test@example.com',
                  createdAt: new Date(),
                  lastModifiedBy: 'test@example.com',
                  lastModified: new Date(),
                }),
              },
              {
                id: 'shape-2',
                data: () => ({
                  x: 200,
                  y: 200,
                  width: 100,
                  height: 100,
                  color: '#4CAF50',
                  zIndex: 1,
                  createdBy: 'test@example.com',
                  createdAt: new Date(),
                  lastModifiedBy: 'test@example.com',
                  lastModified: new Date(),
                }),
              },
            ];
            shapes.forEach(fn);
          },
        });
        return mockUnsubscribe;
      });

      (firestore.query as jest.Mock).mockReturnValue({});
      (firestore.collection as jest.Mock).mockReturnValue({});

      const unsubscribe = subscribeToShapes(mockCallback);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'shape-1' }),
          expect.objectContaining({ id: 'shape-2' }),
        ])
      );

      // Verify shapes are sorted by z-index (descending: higher first for rendering)
      const shapesArg = mockCallback.mock.calls[0][0];
      expect(shapesArg[0].zIndex).toBeGreaterThan(shapesArg[1].zIndex);

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});

