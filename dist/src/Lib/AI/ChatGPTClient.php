<?php

namespace Lib\AI;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Lib\Validator;

/**
 * ChatGPTClient handles communication with the OpenAI API for generating chat responses.
 */
class ChatGPTClient
{
    private $client;
    private $apiUrl;
    private $apiKey;
    private $cache = [];

    /**
     * Constructor initializes the Guzzle HTTP client and sets up API configuration.
     */
    public function __construct(Client $client = null)
    {
        // Initialize the Guzzle HTTP client, allowing for dependency injection
        $this->client = $client ?: new Client();

        // API URL for chat completions
        $this->apiUrl = 'https://api.openai.com/v1/chat/completions';

        // Get the API key from environment variables (keep this private and secure)
        $this->apiKey = $_ENV['CHATGPT_API_KEY'];
    }

    /**
     * Determines the appropriate model based on internal logic.
     *
     * @param array $conversationHistory The conversation history array.
     * @return string The model name to be used.
     */
    protected function determineModel(array $conversationHistory): string
    {
        $messageCount = count($conversationHistory);
        $totalTokens = array_reduce($conversationHistory, function ($carry, $item) {
            return $carry + str_word_count($item['content'] ?? '');
        }, 0);

        // If the conversation is long or complex, use a model with more tokens
        if ($totalTokens > 4000 || $messageCount > 10) {
            return 'gpt-3.5-turbo-16k'; // Use the model with a larger token limit
        }

        // Default to the standard model for shorter conversations
        return 'gpt-3.5-turbo';
    }

    /**
     * Formats the conversation history to ensure it is valid.
     *
     * @param array $conversationHistory The conversation history array.
     * @return array The formatted conversation history.
     */
    protected function formatConversationHistory(array $conversationHistory): array
    {
        $formattedHistory = [];
        foreach ($conversationHistory as $message) {
            if (is_array($message) && isset($message['role'], $message['content']) && Validator::string($message['content'])) {
                $formattedHistory[] = $message;
            } else {
                $formattedHistory[] = ['role' => 'user', 'content' => (string) $message];
            }
        }
        return $formattedHistory;
    }

    /**
     * Sends a message to the OpenAI API and returns the AI's response.
     *
     * @param array $conversationHistory The conversation history array containing previous messages.
     * @param string $userMessage The new user message to add to the conversation.
     * @return string The AI-generated response.
     * @throws \InvalidArgumentException If a message in the conversation history is not valid.
     * @throws \RuntimeException If the API request fails.
     */
    public function sendMessage(array $conversationHistory, string $userMessage): string
    {
        if (!Validator::string($userMessage)) {
            throw new \InvalidArgumentException("Invalid user message: must be a string.");
        }

        // Optional: Convert emojis or special patterns in the message
        $userMessage = Validator::emojis($userMessage);

        // Format the conversation history
        $formattedHistory = $this->formatConversationHistory($conversationHistory);

        // Add the new user message
        $formattedHistory[] = ['role' => 'user', 'content' => $userMessage];

        // Check cache first
        $cacheKey = md5(serialize($formattedHistory));
        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }

        // Determine the appropriate model to use
        $model = $this->determineModel($formattedHistory);

        try {
            // Sending a POST request to the AI API
            $response = $this->client->request('POST', $this->apiUrl, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'model' => $model,
                    'messages' => $formattedHistory,
                    'max_tokens' => 500,
                ],
            ]);

            // Get the body of the response
            $responseBody = $response->getBody();
            $responseContent = json_decode($responseBody, true);

            // Check if response is in expected format
            if (isset($responseContent['choices'][0]['message']['content'])) {
                $aiMessage = $responseContent['choices'][0]['message']['content'];
                // Cache the result
                $this->cache[$cacheKey] = $aiMessage;
                return $aiMessage;
            }

            throw new \RuntimeException('Unexpected API response format.');
        } catch (RequestException $e) {
            // Log error here if you have a logger
            throw new \RuntimeException("API request failed: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Converts a GPT response to user-friendly HTML.
     *
     * @param string $gptResponse The raw response from GPT.
     * @return string The formatted HTML.
     */
    public function formatGPTResponseToHTML(string $gptResponse): string
    {
        try {
            // Decode all HTML entities including numeric ones
            $gptResponse = html_entity_decode($gptResponse, ENT_QUOTES | ENT_HTML401, 'UTF-8');

            // Decode HTML special characters that might still be encoded
            $gptResponse = htmlspecialchars_decode($gptResponse, ENT_QUOTES | ENT_HTML401);

            // Handle code blocks with optional language identifiers (```csharp ... ``` or ``` ... ```)
            $gptResponse = preg_replace_callback('/```(\w+)?\s*([\s\S]*?)\s*```/m', function ($matches) {
                $languageClass = isset($matches[1]) ? ' class="language-' . htmlspecialchars($matches[1], ENT_QUOTES | ENT_HTML401) . '"' : '';
                return '<pre><code' . $languageClass . '>' . htmlspecialchars($matches[2], ENT_QUOTES | ENT_HTML401) . '</code></pre>';
            }, $gptResponse);

            // Convert inline code (`code`) to <code></code> without double escaping
            $gptResponse = preg_replace_callback('/`([^`]+)`/', function ($matches) {
                return '<code>' . htmlspecialchars($matches[1], ENT_QUOTES | ENT_HTML401) . '</code>';
            }, $gptResponse);

            // Convert bold text (e.g., **text** or __text__ -> <strong>text</strong>)
            $gptResponse = preg_replace('/(\*\*|__)(.*?)\1/', '<strong>$2</strong>', $gptResponse);

            // Convert italic text (e.g., *text* or _text_ -> <em>text</em>)
            $gptResponse = preg_replace('/(\*|_)(.*?)\1/', '<em>$2</em>', $gptResponse);

            // Convert strikethrough text (e.g., ~~text~~ -> <del>text</del>)
            $gptResponse = preg_replace('/~~(.*?)~~/s', '<del>$1</del>', $gptResponse);

            // Convert Markdown links [text](url) to HTML links <a href="url">text</a>
            $gptResponse = preg_replace_callback('/\[(.*?)\]\((https?:\/\/[^\s]+)\)/', function ($matches) {
                return '<a href="' . htmlspecialchars($matches[2], ENT_QUOTES | ENT_HTML401) . '" target="_blank">' . htmlspecialchars($matches[1], ENT_QUOTES | ENT_HTML401) . '</a>';
            }, $gptResponse);

            // Auto-detect and convert raw URLs to clickable links
            $gptResponse = preg_replace('/(?<!href="|">)(https?:\/\/[^\s]+)/', '<a href="$1" target="_blank">$1</a>', $gptResponse);

            // Convert headers (e.g., # Header -> <h1>Header</h1>)
            $gptResponse = preg_replace_callback('/^(#{1,6})\s*(.*?)$/m', function ($matches) {
                $level = strlen($matches[1]);
                return '<h' . $level . '>' . htmlspecialchars($matches[2], ENT_QUOTES | ENT_HTML401) . '</h' . $level . '>';
            }, $gptResponse);

            // Convert blockquotes (e.g., > quote -> <blockquote>quote</blockquote>)
            $gptResponse = preg_replace('/^>\s*(.*?)$/m', '<blockquote>$1</blockquote>', $gptResponse);

            // Convert unordered lists (e.g., - item or * item -> <ul><li>item</li></ul>)
            $gptResponse = preg_replace_callback('/(?:^\s*[-*]\s+.*$(?:\n|$))+/m', function ($matches) {
                return '<ul>' . preg_replace('/^\s*[-*]\s+(.*)$/m', '<li>$1</li>', $matches[0]) . '</ul>';
            }, $gptResponse);

            // Convert ordered lists (e.g., 1. item -> <ol><li>item</li></ol>)
            $gptResponse = preg_replace_callback('/(?:^\d+\.\s+.*$(?:\n|$))+/m', function ($matches) {
                return '<ol>' . preg_replace('/^\s*\d+\.\s+(.*)$/m', '<li>$1</li>', $matches[0]) . '</ol>';
            }, $gptResponse);

            // Convert newlines to <br> for better formatting in HTML, except within <pre> and <code> tags
            $gptResponse = preg_replace_callback('/<(pre|code)>(.*?)<\/\1>/s', function ($matches) {
                return $matches[0]; // Keep preformatted text as it is
            }, $gptResponse);

            // Convert remaining newlines to <br>
            $gptResponse = nl2br($gptResponse);

            return $gptResponse;
        } catch (\Throwable) {
            return $gptResponse;
        }
    }
}
