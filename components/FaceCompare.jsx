import React, { useState, useEffect } from 'react';
import { User, Camera, Upload, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
// import PhotoVerificationSidebar from './Sidebar';

// Simple Button Component
const Button = ({ children, onClick, disabled, className }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} transition-all active:scale-95`}
    >
        {children}
    </button>
);

const FaceCompare = ({ embedded = false }) => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loadingError, setLoadingError] = useState(null);
    const [isComparing, setIsComparing] = useState(false);

    // Initialize the 4 specific pairs from your requirements
    const [pairs, setPairs] = useState([
        {
            id: 'rtp-portal',
            title: 'RTP (Real Time Photo) vs Portal(IC)',
            slot1: { label: 'Upload RTP', url: null, imgHtml: null },
            slot2: { label: 'Upload Portal(IC)', url: null, imgHtml: null },
            result: null
        },
        {
            id: 'kyc-kyc',
            title: 'KYC vs KYC',
            slot1: { label: 'Upload KYC', url: null, imgHtml: null },
            slot2: { label: 'Upload KYC', url: null, imgHtml: null },
            result: null
        },
        {
            id: 'kyc-rtp',
            title: 'KYC vs RTP (Real Time Photo)',
            slot1: { label: 'Upload KYC', url: null, imgHtml: null },
            slot2: { label: 'Upload RTP', url: null, imgHtml: null },
            result: null
        },
        {
            id: 'kyc-portal',
            title: 'KYC vs Portal(IC)',
            slot1: { label: 'Upload KYC', url: null, imgHtml: null },
            slot2: { label: 'Upload Portal(IC)', url: null, imgHtml: null },
            result: null
        }
    ]);

    // --- 1. Load Models ---
    useEffect(() => {
        const loadFaceApi = async () => {
            try {
                if (!window.faceapi) {
                    const script = document.createElement('script');
                    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
                    script.async = true;
                    document.body.appendChild(script);
                    await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = reject;
                    });
                }

                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                // Load High Accuracy Models
                await Promise.all([
                    window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                setModelsLoaded(true);
            } catch (error) {
                console.error("Model Load Error:", error);
                setLoadingError("Failed to load AI models.");
            }
        };
        loadFaceApi();
    }, []);

    // --- 2. Handle Uploads ---
    const handleImageUpload = async (index, slotKey, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.crossOrigin = "anonymous";
        await new Promise(resolve => { img.onload = resolve; });

        setPairs(prev => {
            const newPairs = [...prev];
            newPairs[index][slotKey] = {
                ...newPairs[index][slotKey],
                url: url,
                imgHtml: img
            };
            newPairs[index].result = null; // Reset result for this pair
            return newPairs;
        });
    };

    // --- 3. Compare Logic ---
    const handleCompareAll = async () => {
        if (!modelsLoaded) return;
        setIsComparing(true);

        const newPairs = [...pairs];
        const options = new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

        for (let i = 0; i < newPairs.length; i++) {
            const pair = newPairs[i];

            // Only process if both images exist
            if (pair.slot1.imgHtml && pair.slot2.imgHtml) {
                try {
                    const detection1 = await window.faceapi
                        .detectSingleFace(pair.slot1.imgHtml, options)
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    const detection2 = await window.faceapi
                        .detectSingleFace(pair.slot2.imgHtml, options)
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (!detection1 || !detection2) {
                        pair.result = { error: true, message: "Face not detected" };
                    } else {
                        const distance = window.faceapi.euclideanDistance(
                            detection1.descriptor,
                            detection2.descriptor
                        );

                        // Calc Similarity
                        let similarity = (1 - distance) * 100;
                        similarity = Math.max(0, Math.min(100, similarity));
                        const isMatch = similarity > 40; // Threshold

                        // Avg Confidence
                        const confidence = ((detection1.detection.score + detection2.detection.score) / 2 * 100).toFixed(1);

                        pair.result = {
                            match: isMatch,
                            similarity: similarity.toFixed(2),
                            confidence: confidence,
                            distance: distance.toFixed(3)
                        };
                    }
                } catch (err) {
                    console.error(err);
                    pair.result = { error: true, message: "Error" };
                }
            } else {
                // If one image is missing, mark as incomplete only if user tried to upload one
                if (pair.slot1.imgHtml || pair.slot2.imgHtml) {
                    pair.result = { error: true, message: "Image Missing" };
                }
            }
        }

        setPairs(newPairs);
        setIsComparing(false);
    };

    const handleReset = () => {
        setPairs(pairs.map(p => ({
            ...p,
            slot1: { ...p.slot1, url: null, imgHtml: null },
            slot2: { ...p.slot2, url: null, imgHtml: null },
            result: null
        })));
    };

    // Helper Component for a Single Upload Box
    const UploadSlot = ({ slot, onUpload, colorClass, iconColor }) => (
        <div className={`
            relative border-2 border-dashed rounded-xl overflow-hidden h-40 flex flex-col items-center justify-center transition-all duration-300 group
            ${slot.url ? `${colorClass} border-opacity-50` : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}
        `}>
            {slot.url ? (
                <img src={slot.url} alt="Slot" className="w-full h-full object-contain" />
            ) : (
                <>
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={onUpload}
                    />
                    <div className={`w-12 h-12 mb-2 ${colorClass} bg-opacity-20 rounded-full flex items-center justify-center`}>
                        <Upload className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase text-center px-2">{slot.label}</span>
                </>
            )}
        </div>
    );

    // The main content of the Face Compare tool
    const Content = (
        <div className={embedded ? "" : "max-w-7xl mx-auto"}>
            <div className="text-center mb-4">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1 flex items-center justify-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        <User className="w-5 h-5" />
                    </div>
                    Face Compare System
                </h1>
                <div className="flex justify-center gap-4">
                    {!modelsLoaded ? (
                        <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading AI Models...
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" /> System Ready
                        </span>
                    )}
                </div>
            </div>

            {/* Grid of 4 Pairs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {pairs.map((pair, idx) => (
                    <div key={pair.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 text-lg">{pair.title}</h3>
                            {pair.result && !pair.result.error && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${pair.result.match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {pair.result.match ? 'Match' : 'No Match'}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <UploadSlot
                                slot={pair.slot1}
                                onUpload={(e) => handleImageUpload(idx, 'slot1', e)}
                                colorClass="bg-blue-500"
                                iconColor="text-blue-600"
                            />
                            <UploadSlot
                                slot={pair.slot2}
                                onUpload={(e) => handleImageUpload(idx, 'slot2', e)}
                                colorClass="bg-purple-500"
                                iconColor="text-purple-600"
                            />
                        </div>

                        {/* Mini Result Bar inside card */}
                        {pair.result && !pair.result.error && (
                            <div className="mt-4 flex justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                <span>Similarity: <b className="text-gray-800">{pair.result.similarity}%</b></span>
                                <span>Distance: <b className="text-gray-800">{pair.result.distance}</b></span>
                            </div>
                        )}
                        {pair.result && pair.result.error && (
                            <div className="mt-4 text-center text-xs text-red-500 bg-red-50 p-2 rounded-lg font-medium">
                                {pair.result.message}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4 mb-6">
                <Button
                    onClick={handleCompareAll}
                    disabled={!modelsLoaded || isComparing}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-2 rounded-xl font-bold text-lg shadow-xl shadow-blue-200 flex items-center gap-2"
                >
                    {isComparing ? <Loader2 className="animate-spin" /> : <Camera />}
                    COMPARE ALL PAIRS
                </Button>
                <Button
                    onClick={handleReset}
                    className="bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 px-6 py-2 rounded-xl font-bold text-lg"
                >
                    RESET
                </Button>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800">Detailed Comparison Results</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-6 py-3 text-left">Comparison Pair</th>
                                <th className="px-6 py-3 text-center">Result</th>
                                <th className="px-6 py-3 text-center">Similarity</th>
                                <th className="px-6 py-3 text-center">Confidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pairs.map((pair) => (
                                <tr key={pair.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{pair.title}</td>
                                    <td className="px-6 py-4 text-center">
                                        {pair.result && !pair.result.error ? (
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${pair.result.match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {pair.result.match ? 'MATCH' : 'NO MATCH'}
                                            </span>
                                        ) : <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono">
                                        {pair.result && !pair.result.error ? `${pair.result.similarity}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-gray-400">
                                        {pair.result && !pair.result.error ? `${pair.result.confidence}%` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    if (embedded) {
        return Content;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* <PhotoVerificationSidebar /> */}
            <div className="flex flex-col min-h-screen">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-800">Face Compare</h2>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 bg-gray-50 p-6">
                    {Content}
                </main>
            </div>
        </div>
    );
};

export default FaceCompare;