
import React from 'react';
import FaceCompare from './components/FaceCompare';

function App() {
  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col items-center p-4 sm:p-6">
      <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Radiaant Face Compare
        </h1>
        <p className="text-gray-400 mt-2">
          Upload two images to see if they're the same person.
        </p>
      </header>
      <main className="w-full max-w-4xl">
        <FaceCompare />
      </main>
      <footer className="w-full max-w-4xl text-center mt-8 text-gray-500 text-sm">
        {/* <p>Powered by Google's Gemini API</p> */}
      </footer>
    </div>
  );
}

export default App;
