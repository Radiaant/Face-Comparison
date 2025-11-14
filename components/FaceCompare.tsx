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
      <label
        htmlFor={id}
        className="flex flex-col items-center justify-center w-full h-64 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview"
            className="h-full w-full object-cover rounded-lg"
          />
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

      <div className="mt-3 text-center text-sm text-gray-400 font-medium">
        {selectedType}
      </div>
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

type ComparisonType = 'RTP (Real Time Video)' | 'KYC' | 'Portal(IC)';

type ComparisonPair = {
  id: string;
  type1: ComparisonType;
  type2: ComparisonType;
  image1: File | null;
  image2: File | null;
  result: (ComparisonResult & { type1?: string; type2?: string }) | null;
  loading: boolean;
};

const FaceCompare = () => {
  const [comparisons, setComparisons] = useState<ComparisonPair[]>([
    {
      id: '1',
      type1: 'RTP (Real Time Video)',
      type2: 'Portal(IC)',
      image1: null,
      image2: null,
      result: null,
      loading: false
    },
    {
      id: '2',
      type1: 'KYC',
      type2: 'KYC',
      image1: null,
      image2: null,
      result: null,
      loading: false
    },
    {
      id: '3',
      type1: 'KYC',
      type2: 'RTP (Real Time Video)',
      image1: null,
      image2: null,
      result: null,
      loading: false
    },
    {
      id: '4',
      type1: 'KYC',
      type2: 'Portal(IC)',
      image1: null,
      image2: null,
      result: null,
      loading: false
    }
  ]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);

  const handleFileChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    comparisonId: string,
    imageType: 'image1' | 'image2'
  ) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setComparisons(prev => 
        prev.map(comp => 
          comp.id === comparisonId 
            ? { ...comp, [imageType]: file, result: null }
            : comp
        )
      );
      setError(null);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Check if all comparisons have both images
    const hasMissingImages = comparisons.some(comp => !comp.image1 || !comp.image2);
    if (hasMissingImages) {
      setError('Please select both images for all comparisons.');
      return;
    }

    setLoading(true);
    setError(null);
    setShowResults(true);

    // Process all comparisons in parallel
    const comparisonPromises = comparisons.map(async (comp) => {
      if (!comp.image1 || !comp.image2) return comp;
      
      try {
        const result = await compareFaces(comp.image1, comp.image2);
        return {
          ...comp,
          result: { 
            ...result, 
            type1: comp.type1, 
            type2: comp.type2 
          },
          loading: false
        };
      } catch (err) {
        console.error(`Error comparing ${comp.type1} and ${comp.type2}:`, err);
        return { ...comp, loading: false };
      }
    });

    try {
      const updatedComparisons = await Promise.all(comparisonPromises);
      setComparisons(updatedComparisons);
    } catch (err: any) {
      setError(err.message || 'An error occurred during comparison.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 p-4 sm:p-8 rounded-xl shadow-2xl border border-gray-700">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {comparisons.map((comp) => (
            <div key={comp.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-center mb-4 text-purple-400">
                {comp.type1} vs {comp.type2}
              </h3>
              <div className="flex flex-col sm:flex-row -m-2">
                <ImageUploadBox
                  id={`${comp.id}-image1`}
                  image={comp.image1}
                  onFileChange={(e) => handleFileChange(e, comp.id, 'image1')}
                  title={`Upload ${comp.type1}`}
                  selectedType={comp.type1}
                  onTypeChange={() => {}}
                />
                <ImageUploadBox
                  id={`${comp.id}-image2`}
                  image={comp.image2}
                  onFileChange={(e) => handleFileChange(e, comp.id, 'image2')}
                  title={`Upload ${comp.type2}`}
                  selectedType={comp.type2}
                  onTypeChange={() => {}}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={loading || comparisons.some(comp => !comp.image1 || !comp.image2)}
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Comparing All Pairs...
              </>
            ) : (
              'Compare All Pairs'
            )}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">
          {error}
        </p>
      )}

      {showResults && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 text-center text-white">Comparison Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-900 rounded-lg overflow-hidden">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Comparison</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Similarity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {comparisons.map((comp) => (
                  <tr key={comp.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
                      {comp.type1} vs {comp.type2}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {comp.result ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          comp.result.match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {comp.result.match ? 'Match' : 'No Match'}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {comp.result ? `${comp.result.similarityPercentage.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {comp.result ? `${comp.result.confidence?.toFixed(2) || 'N/A'}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceCompare;
