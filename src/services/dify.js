
// Dify API Integration
const rawBaseUrl = import.meta.env.VITE_DIFY_BASE_URL || 'https://dify.acesohealthy.com/v1'
const DIFY_BASE_URL = rawBaseUrl.replace('http://', 'https://')
const DIFY_API_KEY = import.meta.env.VITE_DIFY_API_KEY

/**
 * Runs Dify Workflow with the uploaded image URL.
 * @param {string} imageUrl - The public URL of the uploaded image
 * @param {string} userId - User ID for conversation tracking
 * @returns {Promise<Object>} Analysis result
 */
export const analyzeImage = async (imageUrl, userId) => {
    if (!DIFY_API_KEY) {
        console.error('Dify API Key missing')
        throw new Error('Dify API Key NOT configured')
    }

    // Construct the payload
    // Assuming the Dify Workflow has an input variable named 'image' (type: string/url)
    // or 'file' (type: image). 
    // We will try sending it as a standard "image" input variable using "remote_url" transfer method
    // which is supported by Dify for Image-type inputs.

    // NOTE: Replace 'image' with the ACTUAL variable name defined in your Dify Workflow "Start" node.
    // If your variable is named differently (e.g. 'input_image'), change it below.
    const inputs = {
        "image": [{
            "type": "image",
            "transfer_method": "remote_url",
            "url": imageUrl
        }]
    }

    // Force HTTPS to prevent Mixed Content errors
    const targetUrl = `${DIFY_BASE_URL}/workflows/run`.replace('http://', 'https://')
    console.log('Calling Dify URL:', targetUrl)

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: inputs,
                response_mode: "blocking",
                user: userId
            })
        })

        if (!response.ok) {
            const err = await response.json()
            throw new Error(err.message || 'Dify API request failed')
        }

        const data = await response.json()

        // Extract the result text
        // Dify "blocking" mode returns: { data: { outputs: { ... } } }
        const outputText = data.data?.outputs?.text || data.data?.outputs?.result || JSON.stringify(data.data?.outputs)

        return {
            status: 'succeeded',
            analysis: outputText || 'No text output from workflow',
            raw: data
        }

    } catch (error) {
        console.error('Dify Analysis Failed:', error)
        throw error
    }
}
