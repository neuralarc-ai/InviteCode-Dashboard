# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Browser console logging

The usage logs dashboard now pulls the `/api/fetch-user-from-logs` API once the
table data is available and prints the structured response (including the raw
log lines) directly to the browser console. Open the console in your browser,
navigate to `/usage-logs`, and you will see a payload similar to what previously
only appeared in the Node terminal. Refreshing the page will re-run the request
if the previous attempt failed.
