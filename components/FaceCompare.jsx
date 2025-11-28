import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Camera, Upload, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import * as faceapi from 'face-api.js';
import ApiService from '../services/ApiService';

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
    const location = useLocation();
    const [currentApplication, setCurrentApplication] = useState(location.state?.application || null);

    // Search state
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('selected_application_number') || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [applicationsList, setApplicationsList] = useState([]);
    const [allApplicationsList, setAllApplicationsList] = useState([]);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loadingError, setLoadingError] = useState(null);
    const [isComparing, setIsComparing] = useState(false);

    //Initialize the 4 specific pairs from your requirements
    const [pairs, setPairs] = useState([
        {
            id: 'rtp-portal',
            title: 'RTP (Real Time Video) vs Portal(IC)',
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
            title: 'KYC vs RTP (Real Time Video)',
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

    // Fetch all applications on mount
    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const response = await ApiService.getAllApplications({ limit: 1000 });
                if (response && response.data) {
                    const apps = Array.isArray(response.data) ? response.data : (response.data.data || []);
                    setAllApplicationsList(apps);
                    setApplicationsList(apps);
                }
            } catch (error) {
                console.error("Failed to fetch applications:", error);
            }
        };
        fetchApplications();
    }, []);

    // Search functionality
    useEffect(() => {
        if (!searchTerm.trim()) {
            setApplicationsList(allApplicationsList);
            return;
        }
        const filtered = allApplicationsList.filter(app => {
            const appNo = app.application_number || app.application_no || '';
            const laName = app.la_name || '';
            return (
                appNo.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                laName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
        setApplicationsList(filtered);
    }, [searchTerm, allApplicationsList]);

    // Auto-load application ONLY when coming from operational dashboard
    useEffect(() => {
        if (location.state?.application && allApplicationsList.length > 0) {
            const app = allApplicationsList.find(a =>
                a.id === location.state.application.id ||
                a.application_id === location.state.application.application_id ||
                (a.application_number || a.application_no) === (location.state.application.application_number || location.state.application.application_no)
            );
            if (app) {
                handleApplicationSelect(app);
            }
        }
    }, [allApplicationsList, location.state]);

    const handleApplicationSelect = async (app) => {
        const appNo = app.application_number || app.application_no;
        setCurrentApplication(app);
        setSearchTerm(appNo);
        setShowDropdown(false);
        localStorage.setItem('selected_application_number', appNo);

        // Reset pairs
        handleReset();

        // Fetch existing comparisons if any
        try {
            const response = await ApiService.getFaceComparisons(app.id || app.application_id);
            if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
                const newPairs = [...pairs];

                for (const comp of response.data) {
                    const pairIndex = newPairs.findIndex(p => p.id === comp.comparison_type);
                    if (pairIndex !== -1) {

                        const updateSlot = async (slotKey, data, name) => {
                            if (!data) return;

                            let url = data;
                            if (!data.startsWith('http') && !data.startsWith('data:')) {
                                url = `data:image/jpeg;base64,${data}`;
                            }

                            const img = new Image();
                            img.src = url;
                            img.crossOrigin = "anonymous";
                            await new Promise(resolve => { img.onload = resolve; });

                            newPairs[pairIndex][slotKey] = {
                                ...newPairs[pairIndex][slotKey],
                                url: url,
                                imgHtml: img,
                                base64: data,
                                fileName: name
                            };
                        };

                        if (comp.image1_data) await updateSlot('slot1', comp.image1_data, comp.image1_name);
                        if (comp.image2_data) await updateSlot('slot2', comp.image2_data, comp.image2_name);

                        newPairs[pairIndex].result = {
                            match: comp.match_status === 'MATCH',
                            similarity: comp.similarity_score,
                            confidence: comp.confidence_level,
                            distance: comp.comparison_details?.distance || 0
                        };
                    }
                }
                setPairs(newPairs);
            }
        } catch (error) {
            console.error("Failed to fetch existing comparisons:", error);
        }
    };

    // --- 1. Load Models ---
    useEffect(() => {
        const loadFaceApi = async () => {
            try {
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
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

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result;
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
                    imgHtml: img,
                    base64: base64,
                    fileName: file.name
                };
                newPairs[index].result = null;
                return newPairs;
            });
        };
    };

    // --- 3. Compare Logic ---
    const handleCompareAll = async () => {
        if (!modelsLoaded) return;
        setIsComparing(true);

        const newPairs = [...pairs];
        const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
        const comparisonsToSave = [];

        for (let i = 0; i < newPairs.length; i++) {
            const pair = newPairs[i];

            if (pair.slot1.imgHtml && pair.slot2.imgHtml) {
                try {
                    const detection1 = await faceapi
                        .detectSingleFace(pair.slot1.imgHtml, options)
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    const detection2 = await faceapi
                        .detectSingleFace(pair.slot2.imgHtml, options)
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (!detection1 || !detection2) {
                        pair.result = { error: true, message: "Face not detected" };
                    } else {
                        const distance = faceapi.euclideanDistance(
                            detection1.descriptor,
                            detection2.descriptor
                        );

                        let similarity = (1 - distance) * 100;
                        similarity = Math.max(0, Math.min(100, similarity));
                        const isMatch = similarity > 40;

                        const confidence = ((detection1.detection.score + detection2.detection.score) / 2 * 100).toFixed(1);

                        pair.result = {
                            match: isMatch,
                            similarity: similarity.toFixed(2),
                            confidence: confidence,
                            distance: distance.toFixed(3)
                        };

                        comparisonsToSave.push({
                            comparison_type: pair.id,
                            image1_data: pair.slot1.base64,
                            image1_name: pair.slot1.fileName || 'image1.jpg',
                            image2_data: pair.slot2.base64,
                            image2_name: pair.slot2.fileName || 'image2.jpg',
                            similarity_score: parseFloat(similarity.toFixed(2)),
                            confidence_level: parseFloat(confidence),
                            match_status: isMatch ? 'MATCH' : 'NO_MATCH',
                            comparison_details: { distance: parseFloat(distance.toFixed(3)) }
                        });
                    }
                } catch (err) {
                    console.error(err);
                    pair.result = { error: true, message: "Error" };
                }
            } else {
                if (pair.slot1.imgHtml || pair.slot2.imgHtml) {
                    pair.result = { error: true, message: "Image Missing" };
                }
            }
        }

        setPairs(newPairs);
        setIsComparing(false);

        const appId = currentApplication?.id || currentApplication?.application_id;
        const appNo = currentApplication?.application_number;

        if (appId && comparisonsToSave.length > 0) {
            try {
                console.log('Saving comparisons...', comparisonsToSave);
                await ApiService.saveFaceComparisons({
                    application_id: appId,
                    application_number: appNo,
                    comparisons: comparisonsToSave
                });
                // Comparison results saved successfully
            } catch (error) {
                console.error('Failed to save comparisons:', error);
            }
        }
    };

    const handleReset = () => {
        setPairs(pairs.map(p => ({
            ...p,
            slot1: { ...p.slot1, url: null, imgHtml: null, base64: null },
            slot2: { ...p.slot2, url: null, imgHtml: null, base64: null },
            result: null
        })));
    };

    const UploadSlot = ({ slot, onUpload }) => (
        <div className={`
            relative border-2 border-dashed rounded-xl overflow-hidden h-48 flex flex-col items-center justify-center transition-all duration-300 group
            ${slot.url ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}
        `}>
            <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={onUpload}
            />
            {slot.url ? (
                <img src={slot.url} alt="Slot" className="w-full h-full object-contain" />
            ) : (
                <>
                    <div className="w-12 h-12 mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                        <Upload className="h-6 w-6 text-gray-500" />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 uppercase text-center px-2">{slot.label}</span>
                </>
            )}
        </div>
    );

    const Content = (
        <div className={embedded ? "" : "max-w-7xl mx-auto"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {pairs.map((pair, idx) => (
                    <div key={pair.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 text-lg">{pair.title}</h3>
                            {pair.result && !pair.result.error && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${pair.result.match ? 'bg-green-100 text-green-700' : 'bg-[#92222D]/10 text-[#92222D]'}`}>
                                    {pair.result.match ? 'Match' : 'No Match'}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <UploadSlot
                                slot={pair.slot1}
                                onUpload={(e) => handleImageUpload(idx, 'slot1', e)}
                            />
                            <UploadSlot
                                slot={pair.slot2}
                                onUpload={(e) => handleImageUpload(idx, 'slot2', e)}
                            />
                        </div>

                        {pair.result && !pair.result.error && (
                            <div className="mt-4 flex justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                <span>Similarity: <b className="text-gray-800">{pair.result.similarity}%</b></span>
                                <span>Distance: <b className="text-gray-800">{pair.result.distance}</b></span>
                            </div>
                        )}
                        {pair.result && pair.result.error && (
                            <div className="mt-4 text-center text-xs text-[#92222D] bg-[#92222D]/10 p-2 rounded-lg font-medium">
                                {pair.result.message}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-center gap-4 mb-12">
                <Button
                    onClick={handleCompareAll}
                    disabled={!modelsLoaded || isComparing}
                    className="bg-[#92222D] hover:bg-[#741B24] text-white px-12 py-4 rounded-lg font-semibold text-base shadow-md flex items-center gap-2"
                >
                    {isComparing ? <Loader2 className="animate-spin" /> : <Camera />}
                    COMPARE ALL PAIRS
                </Button>
                <Button
                    onClick={handleReset}
                    className="bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 px-8 py-4 rounded-lg font-semibold text-base"
                >
                    RESET
                </Button>
            </div>

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
                                <tr key={pair.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{pair.title}</td>
                                    <td className="px-6 py-4 text-center">
                                        {pair.result && !pair.result.error ? (
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${pair.result.match ? 'bg-green-100 text-green-800' : 'bg-[#92222D]/10 text-[#92222D]'
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
        <div className="flex min-h-screen bg-gray-50">
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b border-gray-200 px-8 py-4 shrink-0">
                    <div className="flex items-center justify-center gap-2">
                        <User className="w-5 h-5 text-gray-700" />
                        <h2 className="text-xl font-semibold text-gray-800">Face Compare System</h2>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-gray-50 p-6">
                    {Content}
                </main>
            </div>
        </div>
    );
};

export default FaceCompare;