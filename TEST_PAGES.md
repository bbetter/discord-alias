# Test Pages

This document describes the test pages available for development and testing.

## Voice Activity Test Page

A standalone test page to view and test the voice activity UI improvements without running the full game.

### Access

Navigate to:
```
http://localhost:5173/?test=voice-activity
```

Or in production:
```
https://your-domain.com/?test=voice-activity
```

### Features

- **Mock Players**: Shows 6 sample players split into 2 teams
- **Interactive Testing**: Click on any stick figure or use the control buttons to toggle speaking animation
- **Test Controls**:
  - Individual player buttons to toggle speaking state
  - "All Speak" button to activate all animations
  - "All Silent" button to stop all animations
  - Counter showing how many players are currently speaking

### What to Test

- ✅ Simple smiling face design (60x60 SVG)
- ✅ Mouth animation: closed smile → open mouth when speaking
- ✅ Visible pulsing animation on open mouth
- ✅ Team color coding (blue for Team A, red for Team B)
- ✅ Responsive design (resize browser to test mobile/tablet views)
- ✅ Panel position at bottom of screen
- ✅ Username display and truncation

### UI Improvements Visible

1. **Bigger Faces**: Changed from stick figures to simple smiling faces (60x60)
2. **Clear Animation**: Mouth visibly changes from closed smile to open mouth
3. **Smooth Transitions**: Opacity fades and pulsing scale animation
4. **Better Visibility**: Larger faces with clear expressions
5. **Team Organization**: Clear team separation with divider
6. **Responsive**: Works well on all screen sizes

## Adding More Test Pages

To add a new test page:

1. Create your test component in `client/src/components/screens/TestYourFeature.tsx`
2. Import it in `client/src/App.tsx`
3. Add a condition in `AppContent` to check for your test parameter:
   ```tsx
   if (testMode === 'your-feature') {
     return <TestYourFeature />;
   }
   ```
4. Access via `/?test=your-feature`
5. Document it in this file
