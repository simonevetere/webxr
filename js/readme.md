# WebXR AR Interactive Framework

A lightweight, modular framework for Augmented Reality (AR) experiences based on **Three.js** and **WebXR Hand Tracking**. This project allows users to spawn interactive objects, manipulate them with natural hand gestures, and manage dynamic menus with state persistence.

## 🚀 Key Features

* **Advanced Hand Tracking**: Natural interaction via pinch-to-grab and direct button hovering/tapping without using traditional raycasters.
* **Realistic Physical Manipulation**: Rotation and positioning anchored to the exact "pinch" point via a Dynamic Pivot system.
* **Modular Architecture**: Built on an asynchronous `Factory` that dynamically loads object modules from the `models/` folder.
* **Dynamic Menus**: Control panels featuring automatic pagination and custom `onClick` actions for every single item.
* **Data Persistence**: Automatic scene saving to `localStorage` to maintain the session state upon reloading.

---

## 📘 Technical Documentation (API & Schema)

### 1. `userData` Schema (Interaction & State)
The framework utilizes the Three.js `userData` object to define the physical and logical behavior of each Mesh.

| Property | Type | Description |
| :--- | :--- | :--- |
| `isActionButton` | `Boolean` | If `true`, the object is detected as clickable by `interact.js`. |
| `onClick` | `Function` | The function executed on touch. Can be defined uniquely for each menu item. |
| `isAnchor` | `Boolean` | Enables the ability to grab and rotate the object. |
| `isFollower` | `Boolean` | If `true`, the object smoothly follows the camera via lerp. |
| `isBillboard` | `Boolean` | If `true`, the object always faces the user (camera lookAt). |
| `isLocked` | `Boolean` | Disables follow and billboard functions when active. |
| `controlledObject`| `Object3D` | Points to a parent object to move when a specific anchor is grabbed. |

### 2. `factory.js` API
The `factory.js` module handles the procedural generation of the UI and controls.

* **`createRoundedTexture(width, height, radius, strokeColor, bgColor, text, isIcon)`**: Generates a dynamic Canvas texture with rounded corners and optimized 512px resolution.
* **`attachControls(panel, width, height)`**: Automatically injects **Lock** (to freeze the object) and **Trash** (to remove it) buttons proportioned to the mesh dimensions.
* **`createMenuContent(items, state, config)`**: Generates the button grid for menus, handling pagination via `state.currentPage` and mapping `item.action` functions.
* **`createArrow(direction, size, action)`**: Creates interactive meshes for navigation (up/down arrows) using SVG icons.

### 3. Interaction Logic (`interact.js`)
* **`handleInteraction`**: Coordinates pinch detection (distance < 0.035m) and button interaction.
* **`updateGrab`**: Implements the **Dynamic Pivot**. It calculates a `grabOffset` and `initRotation` at the moment of pinch, allowing the object to rotate naturally around the contact point instead of its geometric center.
* **`handleHover`**: Provides visual feedback by applying a scaling effect (1.15x) when the hand approaches an anchor.

---

## 📦 How to Add New Objects
1.  Create a `.js` file in `models/` (e.g., `chair.js`) that exports a `create(params)` function.
2.  Add the item to the `menuItems` array in `controlPanel.js` by defining its action:
    ```javascript
    { label: 'Chair', action: () => window.spawnObject?.('chair') }
    ```

---

## 📄 Requirements
* Browser compatible with **WebXR Hand Tracking** (e.g., Meta Quest 2/3/Pro).
* **HTTPS** protocol for XR API access.

---
> **Documentation generated with Gemini.**