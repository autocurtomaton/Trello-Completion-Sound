// ==UserScript==
// @name         Trello Completion Sound
// @namespace    local.trello.completion-sound
// @version      5.0
// @description  Plays a sound when a card is moved to Complete directly or through Butler.
// @match        https://trello.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ========================================================================
    // Configuration
    // ========================================================================

    const DONE_LIST_ID = '6a3dbc2261059d08992791ad';

    // Used to recognize the response from your Butler card button.
    const BUTLER_BUTTON_NAME = 'Done!';
    const DONE_LIST_NAME = 'Complete 🎉';

    // ========================================================================
    // Fetch interception
    // ========================================================================

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        const [resource, options = {}] = args;

        const url =
            typeof resource === 'string'
                ? resource
                : resource?.url ?? '';

        const method =
            options.method ??
            resource?.method ??
            'GET';

        const movedDirectlyToDone = requestMovesDirectlyToDone(
            method,
            options.body
        );

        const response = await originalFetch.apply(this, args);

        if (!response.ok) {
            return response;
        }

        if (movedDirectlyToDone) {
            console.log(
                '[Trello Completion Sound] Direct move to Complete detected.',
                { url }
            );

            playCompletionSound();
            return response;
        }

        /*
         * Butler performs its actions on Trello's servers, so the original
         * browser request does not contain the destination list ID.
         *
         * Inspect a clone because Trello still needs to read the original
         * response body.
         */
        void inspectButlerResponse(response.clone(), url);

        return response;
    };

    // ========================================================================
    // Direct card-move detection
    // ========================================================================

    function requestMovesDirectlyToDone(method, requestBody) {
        if (method.toUpperCase() !== 'PUT' || !requestBody) {
            return false;
        }

        try {
            const body =
                typeof requestBody === 'string'
                    ? JSON.parse(requestBody)
                    : requestBody;

            return body?.idList === DONE_LIST_ID;
        } catch {
            return false;
        }
    }

    // ========================================================================
    // Butler card-button detection
    // ========================================================================

    async function inspectButlerResponse(response, url) {
        try {
            const contentType =
                response.headers.get('content-type') ?? '';

            if (!contentType.includes('application/json')) {
                return;
            }

            const responseBody = await response.json();

            if (!Array.isArray(responseBody?.messages)) {
                return;
            }

            const messages = responseBody.messages
                .map((entry) => normalizeWhitespace(entry?.message))
                .filter(Boolean);

            const buttonWasRun = messages.some(
                (message) =>
                    message.includes(
                        `Running "${BUTLER_BUTTON_NAME}"`
                    )
            );

            const cardWasMovedToDone = messages.some(
                (message) =>
                    message.includes(
                        `to list "${normalizeWhitespace(DONE_LIST_NAME)}"`
                    )
            );

            if (buttonWasRun && cardWasMovedToDone) {
                console.log(
                    '[Trello Completion Sound] Butler move to Complete detected.',
                    {
                        button: BUTLER_BUTTON_NAME,
                        list: DONE_LIST_NAME,
                        url
                    }
                );

                playCompletionSound();
            }
        } catch (error) {
            /*
             * Most Trello responses are unrelated to Butler. Failure to parse
             * one should not interfere with Trello or clutter the console.
             */
            console.debug(
                '[Trello Completion Sound] Response inspection skipped.',
                error
            );
        }
    }

    function normalizeWhitespace(value) {
        return typeof value === 'string'
            ? value.replace(/\s+/g, ' ').trim()
            : '';
    }

    // ========================================================================
    // Completion sound
    // ========================================================================

    function playCompletionSound() {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            console.warn(
                '[Trello Completion Sound] Web Audio is unavailable.'
            );
            return;
        }

        const audioContext = new AudioContextClass();
        const notes = [659.25, 783.99, 1046.5];

        notes.forEach((frequency, index) => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            const start =
                audioContext.currentTime + index * 0.09;

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(
                frequency,
                start
            );

            gain.gain.setValueAtTime(0.14, start);
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                start + 0.18
            );

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start(start);
            oscillator.stop(start + 0.18);
        });

        window.setTimeout(() => {
            void audioContext.close();
        }, 700);
    }

    console.log(
        '[Trello Completion Sound] Direct and Butler detection installed.'
    );
})();