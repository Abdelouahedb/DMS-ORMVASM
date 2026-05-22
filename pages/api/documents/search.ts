import type { NextApiRequest, NextApiResponse } from 'next';
import { solrClient } from '../../../lib/solrClient';

// Utility function to escape special characters in Solr queries
function escapeQuery(query: string): string {
    return query.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, '\\$1'); // Escape special characters
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { query, start = 0, rows = 10 } = req.query; // Extract query, start, and rows

    // Validate the query parameter
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Missing or invalid search query.' });
    }

    try {
        // Escape the query to prevent special character issues
        const escapedQuery = escapeQuery(query);

        // Build Solr query string using edismax parser
        const solrQueryString = [
            `q=${encodeURIComponent(escapedQuery)}`,
            `defType=edismax`,
            `qf=${encodeURIComponent('title^3 author^2 category^2 service_name^1 content^4 keywords^1')}`,
            `start=${parseInt(start as string, 10)}`,
            `rows=${parseInt(rows as string, 10)}`,
            `wt=json`
        ].join('&');

        // Perform the search using the Solr client
        const result = await solrClient.search(solrQueryString);

        // Return the search results
        res.status(200).json({
            numFound: result.response.numFound, // Total number of results
            docs: result.response.docs          // Array of document results
        });
    } catch (error: any) {
        console.error('Solr search error:', error);
        res.status(500).json({ message: 'Search failed. Please try again later.', error: error.message });
    }
}