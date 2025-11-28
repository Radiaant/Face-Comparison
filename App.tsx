
import React from 'react';
import FaceCompare from './components/FaceCompare';

import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="bg-white min-h-screen text-gray-900">
        <FaceCompare />
      </div>
    </BrowserRouter>
  );
}

export default App;
