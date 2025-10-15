graph TB
    subgraph ClientBrowser["Client Browser"]
        subgraph ReactApp["React Application"]
            subgraph UIComponents["UI Components - 3-Column Layout"]
                Auth[Auth Components<br/>Login/Signup<br/>Email = Username]
                
                Header[Header Component<br/>App Title + FPS Counter<br/>ActiveUsers List far right<br/>Displays Emails<br/>Toast Notifications top-right]
                
                LeftTool[Left Toolbar<br/>ALWAYS VISIBLE<br/>Color Picker 5 colors<br/>Create Rectangle Btn<br/>Creates at Viewport Center]
                
                Canvas[Canvas Component<br/>Off-white Background<br/>5000x5000px<br/>Pan: Drag Empty Space<br/>Zoom: Wheel Pinch Shift<br/>10%-800% Limits<br/>Viewport Independent]
                
                PropsPanel[Right Properties Panel<br/>VISIBLE WHEN SELECTED<br/>Color Picker editable<br/>Z-Index Input editable<br/>Width Height read-only<br/>X Y Position read-only<br/>Delete Button]
                
                Rectangle[Rectangle Component<br/>Drag to Move no selection<br/>Single Top-Right Resize Handle<br/>Solid Dark Blue Selection<br/>100x100px default<br/>Min 1x1 Max 4000x4000]
                
                FPS[FPSCounter<br/>60 FPS Monitor<br/>Dev Mode Only<br/>Disabled in Production]
                
                CursorOvl[CursorOverlay<br/>Color Labels Blue Red<br/>NOT Emails Usernames<br/>Randomly Colored Cursors]
                
                EditInd[EditingIndicator<br/>User X is editing<br/>Border Cursor Color<br/>Light Gray Background<br/>Shown During Active Edit]
                
                ActiveUsers[ActiveUsers Component<br/>Top Header Far Right<br/>Shows Email Addresses<br/>User Count List]
            end
            
            subgraph StateManagement["State Management - React Context API"]
                AuthCtx[AuthContext<br/>User State Auth Ops<br/>Email Username<br/>Session Management]
                
                CanvasCtx[CanvasContext<br/>Shapes State CRUD<br/>Z-Index Management<br/>Optimistic Updates<br/>NO Selection State Here]
            end
            
            subgraph CustomHooks["Custom Hooks"]
                useAuth[useAuth<br/>Auth Operations<br/>Email as Username]
                
                useCanvas[useCanvas<br/>Canvas Operations<br/>Optimistic Updates<br/>Z-Index Auto Manual<br/>Move Resize Recolor Delete]
                
                useCursors[useCursors<br/>Cursor Tracking 60 FPS<br/>Color Name Labels<br/>Color Assignment]
                
                usePresence[usePresence<br/>Presence Management<br/>Email Display<br/>Join Leave]
                
                useFPS[useFPS<br/>FPS Monitoring<br/>requestAnimationFrame<br/>60 FPS Target]
            end
            
            subgraph ServicesLayer["Services Layer - 8 Services"]
                AuthSvc[Auth Service<br/>signup login logout<br/>Email Username<br/>No separate username]
                
                CanvasSvc[Canvas Service<br/>Firestore CRUD<br/>Canvas default-canvas<br/>Z-Index Persistence<br/>Optimistic Updates<br/>Retry Logic 3 attempts<br/>Error Handling Toast]
                
                ZIndexSvc[Z-Index Service NEW<br/>Auto lastModified to front<br/>Manual Push-down Logic<br/>No Duplicate Z-Indices]
                
                CursorSvc[Cursor Service<br/>RTDB High-frequency<br/>Color Name Hex<br/>Canvas default-canvas<br/>16ms Throttle]
                
                SelectionSvc[Selection Service NEW<br/>RTDB Ephemeral State<br/>Does NOT Persist<br/>onDisconnect Cleanup]
                
                ActiveEditsSvc[ActiveEdits Service NEW<br/>RTDB Conflict Awareness<br/>Track moving resizing recoloring<br/>Cursor Color for Indicator]
                
                PresenceSvc[Presence Service<br/>RTDB with onDisconnect<br/>Email Display<br/>Canvas default-canvas<br/>Connection Status Toast<br/>info connected Listener]
                
                FirebaseInit[Firebase Init<br/>Auth Firestore RTDB<br/>Hybrid Architecture]
            end
            
            subgraph RenderingEngine["Rendering Engine"]
                Konva[Konva.js<br/>60 FPS Canvas Rendering<br/>requestAnimationFrame<br/>Z-Order Higher zIndex Back<br/>Sort by zIndex for Render]
            end
            
            subgraph Utilities["Utilities"]
                Helpers[Helper Functions<br/>generateCursorColor<br/>Hash userId Unique Color<br/>NOT for Username Display]
                
                Constants[Constants EXPANDED<br/>CANVAS 5000x5000 FAFAFA<br/>CANVAS_ID default-canvas<br/>RECT 100x100 Min 1 Max 4000<br/>ZOOM 10%-800%<br/>COLORS Material Design<br/>Blue 2196F3 Green 4CAF50<br/>Red F44336 Orange FF9800<br/>Black 212121]
                
                Throttle[Throttle Utility<br/>16ms for 60 FPS<br/>Cursor Updates]
            end
        end
    end
    
    subgraph FirebaseBackend["Firebase Backend"]
        subgraph FirebaseAuth["Firebase Authentication"]
            FBAuth[Firebase Auth<br/>Email Password<br/>Email Username<br/>JWT Tokens]
        end
        
        subgraph CloudFirestore["Cloud Firestore - PERSISTENT Data Only"]
            FSShapes[("Shapes Collection<br/>canvases default-canvas shapes id<br/>PERSISTENT FIELDS<br/>x y width height color<br/>zIndex 1 front higher back<br/>createdBy createdAt<br/>lastModifiedBy lastModified<br/>NO Selection State<br/>NO currentlyEditedBy<br/>100ms Latency")]
        end
        
        subgraph RealtimeDB["Realtime Database - EPHEMERAL Data Only"]
            RTDBCursors[("Cursors Path<br/>cursors default-canvas userId<br/>colorName Blue Red label<br/>cursorColor hex rendering<br/>x y lastUpdate<br/>60 FPS 16ms Throttle<br/>onDisconnect Auto-cleanup<br/>20-50ms Latency")]
            
            RTDBPresence[("Presence Path<br/>presence default-canvas userId<br/>email username display<br/>online joinedAt lastSeen<br/>onDisconnect Hooks<br/>30s Heartbeat<br/>Auto-cleanup")]
            
            RTDBSelections[("Selections Path NEW<br/>selections default-canvas userId<br/>selectedShapeId<br/>selectedAt<br/>EPHEMERAL No Persist<br/>onDisconnect Auto-clear")]
            
            RTDBActiveEdits[("ActiveEdits Path NEW<br/>activeEdits default-canvas shapeId<br/>userId email<br/>action moving resizing recoloring<br/>cursorColor for indicator<br/>startedAt<br/>onDisconnect Auto-clear")]
        end
        
        subgraph FirebaseHosting["Firebase Hosting"]
            Hosting[Firebase Hosting<br/>Static CDN Hosting<br/>Single-Page App Config<br/>PROJECT_ID web app<br/>FPS Counter Disabled<br/>Env Vars Firebase Console]
        end
        
        subgraph SecurityRules["Security Rules"]
            FirestoreRules[Firestore Rules<br/>Auth Required<br/>Shapes Only<br/>Z-Index Validation]
            
            RTDBRules[RTDB Rules<br/>Auth Required<br/>4 Paths Cursors<br/>Presence Selections<br/>ActiveEdits]
        end
    end
    
    subgraph TestingInfra["Testing Infrastructure"]
        subgraph TestSuite["Test Suite - 21 Files v3.0"]
            UnitTests[Unit Tests 11 Files<br/>8 Services 3 Utils<br/>Z-Index Service<br/>Selection Service<br/>ActiveEdits Service<br/>Throttle Helpers]
            
            IntegrationTests[Integration Tests 10 Files<br/>UI Layout Test<br/>Z-Index Test<br/>Conflict Resolution Test<br/>Optimistic Updates<br/>Stress Testing Scenarios]
        end
        
        subgraph FirebaseEmulators["Firebase Emulators"]
            AuthEmu[Auth Emulator<br/>Port 9099<br/>Email Auth Testing]
            
            FirestoreEmu[Firestore Emulator<br/>Port 8080<br/>Z-Index Persistence<br/>Push-down Testing]
            
            RTDBEmu[RTDB Emulator<br/>Port 9000<br/>4 Paths Testing<br/>Ephemeral State]
        end
    end
    
    subgraph PerfMonitoring["Performance Monitoring"]
        PerfTools[Performance Tools<br/>FPS Counter Dev Only<br/>requestAnimationFrame<br/>Load Test 500 shapes<br/>Z-Index Performance<br/>Optimistic Updates<br/>5 Concurrent Users]
    end
    
    %% Component Relationships
    Header --> ActiveUsers
    Header --> FPS
    LeftTool --> CanvasCtx
    Canvas --> Rectangle
    Canvas --> CursorOvl
    Canvas --> Konva
    Rectangle --> EditInd
    PropsPanel --> CanvasCtx
    Auth --> AuthCtx
    
    %% Context to Hooks
    AuthCtx --> useAuth
    CanvasCtx --> useCanvas
    CanvasCtx --> useCursors
    CanvasCtx --> usePresence
    
    %% Hooks to Services
    useAuth --> AuthSvc
    useCanvas --> CanvasSvc
    useCanvas --> ZIndexSvc
    useCanvas --> SelectionSvc
    useCanvas --> ActiveEditsSvc
    useCursors --> CursorSvc
    usePresence --> PresenceSvc
    useFPS --> PerfTools
    
    %% Services to Firebase Init
    AuthSvc --> FirebaseInit
    CanvasSvc --> FirebaseInit
    ZIndexSvc --> FirebaseInit
    CursorSvc --> FirebaseInit
    SelectionSvc --> FirebaseInit
    ActiveEditsSvc --> FirebaseInit
    PresenceSvc --> FirebaseInit
    
    %% Firebase Init to Backend
    FirebaseInit --> FBAuth
    FirebaseInit --> FSShapes
    FirebaseInit --> RTDBCursors
    FirebaseInit --> RTDBPresence
    FirebaseInit --> RTDBSelections
    FirebaseInit --> RTDBActiveEdits
    
    %% Rendering
    FPS -.->|Monitor| Konva
    
    %% Utilities
    Constants -.-> CanvasSvc
    Constants -.-> ZIndexSvc
    Constants -.-> CursorSvc
    Constants -.-> SelectionSvc
    Constants -.-> PresenceSvc
    Constants -.-> LeftTool
    Constants -.-> Canvas
    Throttle -.-> CursorSvc
    Throttle -.-> useCursors
    Helpers -.-> useCursors
    
    %% Real-time Sync - Firestore PERSISTENT
    CanvasSvc -->|OPTIMISTIC CREATE<br/>Local First Then Sync<br/>With Z-Index 1| FSShapes
    CanvasSvc -->|OPTIMISTIC UPDATE<br/>Position Size Color<br/>Auto Z-Index 1| FSShapes
    CanvasSvc -->|OPTIMISTIC DELETE<br/>Local First Then Sync| FSShapes
    FSShapes -.->|onSnapshot Listener<br/>Real-time to All Users<br/>Last Write Wins| CanvasSvc
    
    %% Z-Index Management
    ZIndexSvc -->|Auto lastModified to 1<br/>Manual Push-down<br/>Batch Updates| FSShapes
    FSShapes -.->|Z-Index Sync| ZIndexSvc
    
    %% Real-time Sync - RTDB EPHEMERAL
    CursorSvc -->|colorName cursorColor<br/>60 FPS 16ms throttle<br/>Position Updates| RTDBCursors
    RTDBCursors -.->|Real-time Listener<br/>onValue| CursorSvc
    RTDBCursors -.->|onDisconnect<br/>Auto-remove| CursorSvc
    
    SelectionSvc -->|selectedShapeId<br/>Ephemeral Only| RTDBSelections
    RTDBSelections -.->|Real-time Listener<br/>Does NOT Persist| SelectionSvc
    RTDBSelections -.->|onDisconnect<br/>Auto-clear| SelectionSvc
    
    ActiveEditsSvc -->|Editing State<br/>Conflict Awareness<br/>Cursor Color| RTDBActiveEdits
    RTDBActiveEdits -.->|Real-time Listener<br/>For Indicators| ActiveEditsSvc
    RTDBActiveEdits -.->|onDisconnect<br/>Auto-clear| ActiveEditsSvc
    
    PresenceSvc -->|Email Display<br/>30s Heartbeat<br/>Online Status| RTDBPresence
    RTDBPresence -.->|Real-time Listener<br/>onValue| PresenceSvc
    RTDBPresence -.->|onDisconnect<br/>Auto-offline| PresenceSvc
    
    %% Auth Flow
    AuthSvc -->|Email Auth<br/>Session Management| FBAuth
    FBAuth -.->|JWT Token<br/>Email as Username| AuthSvc
    
    %% Security
    FirestoreRules -.->|Enforce<br/>Z-Index Valid| FSShapes
    RTDBRules -.->|Enforce| RTDBCursors
    RTDBRules -.->|Enforce| RTDBPresence
    RTDBRules -.->|Enforce| RTDBSelections
    RTDBRules -.->|Enforce| RTDBActiveEdits
    
    %% Deployment
    Hosting -->|Serves Build| Auth
    Hosting -->|Serves Build| Canvas
    Hosting -->|Serves Build| Header
    
    %% Testing
    UnitTests -.->|Mock Test<br/>All 8 Services| AuthSvc
    UnitTests -.->|Test Z-Index Logic| ZIndexSvc
    UnitTests -.->|Test Ephemeral State| SelectionSvc
    UnitTests -.->|Test Conflict State| ActiveEditsSvc
    
    IntegrationTests -->|Test via| AuthEmu
    IntegrationTests -->|Test Z-Index<br/>Push-down| FirestoreEmu
    IntegrationTests -->|Test 4 RTDB Paths<br/>Ephemeral State| RTDBEmu
    IntegrationTests -.->|Optimistic Updates<br/>Conflict Resolution<br/>Last Write Wins| PerfTools
    
    %% Performance
    PerfTools -.->|Monitor 60 FPS| Konva
    PerfTools -.->|Z-Index Performance| ZIndexSvc
    PerfTools -.->|500 Shapes Test| FSShapes
    PerfTools -.->|5 Users Test| RTDBPresence
    
    %% User Interactions
    Users([Multiple Users<br/>Browsers<br/>All on default-canvas<br/>Independent Viewports]) -->|HTTPS| Hosting
    
    Users -->|Optimistic Updates<br/>Immediate Local Feedback<br/>Then Firestore Sync| FSShapes
    
    Users -->|60 FPS Cursors<br/>Color Labels| RTDBCursors
    
    Users -->|Ephemeral Selections<br/>No Persistence| RTDBSelections
    
    Users -->|Conflict Awareness<br/>Editing Indicators| RTDBActiveEdits
    
    Users -->|Email Display<br/>Presence| RTDBPresence
    
    %% Multi-user Broadcasting
    FSShapes -.->|Broadcast All Changes<br/>Create Move Resize Recolor Delete<br/>Last Write Wins<br/>100ms latency| Users
    
    RTDBCursors -.->|Broadcast Cursors<br/>Color Labels<br/>20-50ms| Users
    
    RTDBSelections -.->|Broadcast Selections<br/>Ephemeral| Users
    
    RTDBActiveEdits -.->|Broadcast Editing State<br/>User X is editing<br/>Cursor Color Border| Users
    
    RTDBPresence -.->|Broadcast Presence<br/>Email Addresses<br/>Instant| Users
    
    %% User Actions
    Users -->|Drag to Move<br/>No Selection Required<br/>Optimistic Local Update| Rectangle
    Users -->|Top-Right Handle<br/>Resize with Tooltip<br/>Optimistic| Rectangle
    Users -->|Select Rectangle<br/>Dark Blue Outline<br/>Ephemeral State| Rectangle
    Users -->|Delete Key Button<br/>Properties Panel<br/>Optimistic Delete| PropsPanel
    Users -->|Change Color<br/>5 Predefined Colors<br/>Optimistic| LeftTool
    Users -->|Manual Z-Index<br/>Properties Panel<br/>Push-down Recalc| PropsPanel
    
    %% Conflict Resolution
    Rectangle -.->|User A Edits<br/>Sets ActiveEdit| ActiveEditsSvc
    EditInd -.->|User B Sees<br/>A is editing indicator<br/>Can Still Edit| Users
    Rectangle -.->|Both Edit<br/>Last Mouse Release<br/>Wins| CanvasSvc
    
    %% Error Handling
    CanvasSvc -.->|Write Fails| CanvasSvc
    CanvasSvc -.->|Retry 1 100ms| FSShapes
    CanvasSvc -.->|Retry 2 300ms| FSShapes
    CanvasSvc -.->|Retry 3 900ms| FSShapes
    CanvasSvc -.->|All Retries Fail<br/>console error<br/>Toast Notification<br/>Revert Optimistic| Users
    PresenceSvc -.->|Connection Lost<br/>info connected false<br/>Toast Reconnecting| Users
    PresenceSvc -.->|Connection Restored<br/>info connected true<br/>Toast Connected| Users
    
    %% Styling
    classDef context fill:#FFE5B4,stroke:#FFA500,stroke-width:3px,color:#000
    classDef firebase fill:#FFA611,stroke:#FF6F00,stroke-width:2px,color:#000
    classDef rtdb fill:#4DD0E1,stroke:#00ACC1,stroke-width:3px,color:#000
    classDef firestore fill:#FFAB91,stroke:#FF5722,stroke-width:2px,color:#000
    classDef react fill:#61DAFB,stroke:#0088CC,stroke-width:2px,color:#000
    classDef service fill:#90EE90,stroke:#228B22,stroke-width:2px,color:#000
    classDef library fill:#DDA0DD,stroke:#8B008B,stroke-width:2px,color:#000
    classDef test fill:#FFB6C1,stroke:#C71585,stroke-width:2px,color:#000
    classDef user fill:#FFE4E1,stroke:#FF69B4,stroke-width:3px,color:#000
    classDef perf fill:#FFD700,stroke:#FF8C00,stroke-width:3px,color:#000
    classDef new fill:#98FB98,stroke:#228B22,stroke-width:3px,color:#000
    
    class AuthCtx,CanvasCtx context
    class FBAuth,Hosting,FirestoreRules,RTDBRules,FirebaseInit firebase
    class FSShapes firestore
    class RTDBCursors,RTDBPresence,RTDBSelections,RTDBActiveEdits rtdb
    class Auth,Canvas,Rectangle,Header,LeftTool,PropsPanel,CursorOvl,EditInd,ActiveUsers,useAuth,useCanvas,useCursors,usePresence,useFPS react
    class AuthSvc,CanvasSvc,ZIndexSvc,CursorSvc,SelectionSvc,ActiveEditsSvc,PresenceSvc service
    class Konva,Helpers,Constants,Throttle library
    class UnitTests,IntegrationTests,AuthEmu,FirestoreEmu,RTDBEmu test
    class Users user
    class PerfTools,FPS perf
    class ZIndexSvc,SelectionSvc,ActiveEditsSvc,RTDBSelections,RTDBActiveEdits,EditInd new