
const ApiService = {
    getAllApplications: async ({ limit }) => {
        console.log('Mock getAllApplications called');
        return {
            data: [
                { id: 1, application_number: 'APP001', la_name: 'John Doe' },
                { id: 2, application_number: 'APP002', la_name: 'Jane Smith' }
            ]
        };
    },
    getFaceComparisons: async (appId) => {
        console.log('Mock getFaceComparisons called for', appId);
        return { data: [] };
    },
    saveFaceComparisons: async (data) => {
        console.log('Mock saveFaceComparisons called with', data);
        return { success: true };
    }
};

export default ApiService;
