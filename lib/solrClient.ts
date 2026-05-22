import SolrNode from 'solr-node';

// Solr configuration from environment variables (for flexibility)
const solrClient = new SolrNode({
    host: process.env.SOLR_HOST || '127.0.0.1',
    port: process.env.SOLR_PORT || '8983',
    core: process.env.SOLR_CORE || 'wewe', // Replace with your Solr core name
    protocol: 'http',
});

// Adding a simple query wrapper for better error handling
const addDocument = async (document: any) => {
    try {
        const response = await solrClient.update(document, { commit: true });
        await solrClient.commit();  // Commit after adding document
        return response;
    } catch (error) {
        console.error('Solr addDocument error:', error);
        throw new Error('Failed to add document to Solr');
    }
};

// Adding a deleteById wrapper for deleting documents by ID
const deleteById = async (id: string) => {
    try {
        const response = await solrClient.delete(`id:${id}`); // Delete by ID
        await solrClient.commit(); // Commit after deletion
        return response;
    } catch (error) {
        console.error('Solr deleteById error:', error);
        throw new Error('Failed to delete document from Solr');
    }
};

export { solrClient, addDocument, deleteById };
