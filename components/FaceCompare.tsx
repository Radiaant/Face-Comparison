import React, { useState, useCallback } from 'react';
import { compareFaces } from '../services/geminiService';
import { ComparisonResult } from '../types';

const ImageUploadBox: React.FC<{
  id: string;
  image: File | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
  selectedType: string;
  onTypeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}> = ({ id, image, onFileChange, title, selectedType, onTypeChange }) => {
  const imageUrl = image ? URL.createObjectURL(image) : null;

  return (
    <div className="w-full sm:w-1/2 p-2 flex flex-col items-center">
      {/* Dropdown below each image */}
      <select
        value={selectedType}
        onChange={onTypeChange}
        className="mt-3 bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded-md p-2 w-3/4 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
      >
        <option value="">Select Photo Type</option>
        <option value="RTP (Real Time Photo)">RTP (Real Time Photo)</option>
        <option value="KYC">KYC</option>
        <option value="Portal Photo">Portal Photo</option>
      </select>
      <label
        htmlFor={id}
        className="flex flex-col items-center justify-center mt-6 w-full h-64 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
      >
        {imageUrl ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
            <img
              src={imageUrl}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <svg
              className="w-8 h-8 mb-4 text-gray-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 
                   5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5
                   a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-400">
              <span className="font-semibold">{title}</span>
            </p>
            <p className="text-xs text-gray-500">JPG, PNG, or JPEG</p>
          </div>
        )}
        <input
          id={id}
          type="file"
          className="hidden"
          accept="image/png, image/jpeg, image/jpg"
          onChange={onFileChange}
        />
      </label>

    </div>
  );
};

const ResultDisplay: React.FC<{ result: ComparisonResult & { type1?: string; type2?: string } }> = ({ result }) => {
  const isMatch = result.match;
  const badgeColor = isMatch ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300';
  const textColor = isMatch ? 'text-green-400' : 'text-red-400';
  const progressColor = isMatch ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="mt-8 p-6 bg-gray-800 border border-gray-700 rounded-lg w-full animate-fade-in">
      <h3 className="text-2xl font-semibold mb-4 text-center">Comparison Result</h3>
      <div className="text-center mb-4">
        <span className={`px-4 py-1.5 text-lg font-bold rounded-full ${badgeColor}`}>
          {isMatch ? 'Verified Match' : 'Not a Match'}
        </span>
      </div>
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-base font-medium text-gray-300">Similarity</span>
          <span className={`text-sm font-medium ${textColor}`}>
            {result.similarityPercentage.toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className={progressColor + ' h-2.5 rounded-full'}
            style={{ width: `${result.similarityPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Show photo type comparison */}
      <div className="mt-4 text-center text-gray-300 text-sm">
        Compared: <span className="font-semibold text-purple-400">{result.type1}</span> vs{' '}
        <span className="font-semibold text-purple-400">{result.type2}</span>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold text-gray-300 mb-2">AI Reasoning:</h4>
        <p className="text-gray-400 text-sm bg-gray-900 p-3 rounded-md">
          {result.reasoning}
        </p>
      </div>
    </div>
  );
};

const FaceCompare = () => {
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [type1, setType1] = useState('');
  const [type2, setType2] = useState('');
  const [result, setResult] = useState<(ComparisonResult & { type1?: string; type2?: string }) | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, setImage: React.Dispatch<React.SetStateAction<File | null>>) => {
      if (event.target.files && event.target.files[0]) {
        setImage(event.target.files[0]);
        setResult(null);
        setError(null);
      }
    },
    []
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!image1 || !image2) {
      setError('Please select both images to compare.');
      return;
    }
    if (!type1 || !type2) {
      setError('Please select photo types for both images.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const apiResult = await compareFaces(image1, image2);
      setResult({ ...apiResult, type1, type2 });
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 p-4 sm:p-8 rounded-xl shadow-2xl border border-gray-700">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row -m-2">
          <ImageUploadBox
            id="file1"
            image={image1}
            onFileChange={(e) => handleFileChange(e, setImage1)}
            title="Upload Image 1"
            selectedType={type1}
            onTypeChange={(e) => setType1(e.target.value)}
          />
          <ImageUploadBox
            id="file2"
            image={image2}
            onFileChange={(e) => handleFileChange(e, setImage2)}
            title="Upload Image 2"
            selectedType={type2}
            onTypeChange={(e) => setType2(e.target.value)}
          />
        </div>
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading || !image1 || !image2}
            className="w-full text-white bg-purple-600 hover:bg-purple-700 focus:ring-4 focus:outline-none focus:ring-purple-800 font-medium rounded-lg text-lg px-5 py-3 text-center transition-all duration-300 ease-in-out disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 
                       0 5.373 0 12h4zm2 5.291A7.962 
                       7.962 0 014 12H0c0 3.042 1.135 
                       5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Comparing...
              </>
            ) : (
              'Compare Faces'
            )}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">
          {error}
        </p>
      )}
      {result && <ResultDisplay result={result} />}
    </div>
  );
};

export default FaceCompare;
