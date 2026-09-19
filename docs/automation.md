# Supervised broadcast automation

The automation dashboard is available at `/automation` to authorized producers.

## Operator workflow

1. Start the correct match and draft from `/control`.
2. Open `/automation` in Chrome or another browser supporting `getDisplayMedia`.
3. Choose **Share broadcast window** and select only the authorized co-stream/broadcast window.
4. Choose **Load champion matcher**. Current portraits are loaded from Riot Data Dragon.
5. Drag a tight rectangle around the broadcast's currently locking champion portrait and save the crop.
6. Adjust the confidence threshold if the broadcast layout applies heavy color treatment.
7. Review the top three suggestions. Click **Confirm lock-in** only after visually checking the broadcast.

The tool requires three stable frames before logging a high-confidence proposal. It never resolves a draft action without moderator confirmation.

## Recognition limits

- Calibration is specific to a broadcast layout and browser window geometry.
- Animated transitions, grayscale portraits, sponsor overlays, unusual crops, and skin artwork reduce confidence.
- Recalibrate after resolution, zoom, or broadcast-layout changes.
- The automation dashboard must not capture a broadcast the producer is not authorized to show.
- Browser OCR depends on the experimental `TextDetector` API and is a convenience, not an authoritative data source.

## Licensed data adapter

Set `ESPORTS_DATA_URL` to an authorized endpoint returning either an array or `{ "matches": [...] }`. Each match may contain:

```json
{
  "id": "series-123",
  "seriesName": "International Final",
  "blueTeam": "Blue Team",
  "redTeam": "Red Team",
  "bestOf": 5,
  "startsAt": "2026-09-20T18:00:00Z"
}
```

Alternative provider fields `event`, `league`, and `teams[0/1].name` are normalized automatically. Use `ESPORTS_DATA_TOKEN` when the endpoint requires a bearer token.
