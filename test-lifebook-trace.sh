#!/bin/bash

# Lifebook Test Tracking Script
# Run this after your call ends to trace the complete journey

CALL_ID="27da8bc4-54e6-48d7-a974-5b212d25a533"
RESIDENT_ID="c2f92365-ede6-48e0-a56f-90503b5159c5"

echo "🔍 LIFEBOOK TEST TRACKING"
echo "=========================="
echo ""

echo "📞 STEP 1: Check Call Status"
echo "----------------------------"
docker exec linda_backend-postgres-1 psql -U linda -d linda -c "
SELECT
  id,
  status,
  \"durationSeconds\",
  \"transcriptText\" IS NOT NULL as has_transcript,
  \"audioUrl\" IS NOT NULL as has_audio
FROM \"Call\"
WHERE id = '$CALL_ID';"
echo ""

echo "💾 STEP 2: Check if Transcript Saved"
echo "-----------------------------------"
docker exec linda_backend-postgres-1 psql -U linda -d linda -c "
SELECT
  LENGTH(\"transcriptText\") as transcript_length,
  LEFT(\"transcriptText\", 100) as transcript_preview
FROM \"Call\"
WHERE id = '$CALL_ID';"
echo ""

echo "🧠 STEP 3: Check Memories Extracted"
echo "-----------------------------------"
docker exec linda_backend-postgres-1 psql -U linda -d linda -c "
SELECT
  category,
  key,
  value,
  confidence,
  \"timesMentioned\"
FROM \"Memory\"
WHERE \"residentId\" = '$RESIDENT_ID'
ORDER BY \"lastMentionedAt\" DESC
LIMIT 10;"
echo ""

echo "📖 STEP 4: Check Story Segments Identified"
echo "-----------------------------------------"
docker exec linda_backend-postgres-1 psql -U linda -d linda -c "
SELECT
  id,
  \"startTimeMs\" / 1000 as start_seconds,
  \"endTimeMs\" / 1000 as end_seconds,
  category,
  \"emotionalTone\",
  \"storyQualityScore\",
  \"audioClipStatus\",
  LEFT(\"transcriptText\", 60) as story_preview
FROM \"StorySegment\"
WHERE \"callId\" = '$CALL_ID'
ORDER BY \"storyQualityScore\" DESC;"
echo ""

echo "🎵 STEP 5: Check Audio Clips Extracted"
echo "-------------------------------------"
docker exec linda_backend-postgres-1 psql -U linda -d linda -c "
SELECT
  id,
  \"audioClipStatus\",
  \"audioClipUrl\" IS NOT NULL as has_clip_url,
  \"storyQualityScore\"
FROM \"StorySegment\"
WHERE \"callId\" = '$CALL_ID'
ORDER BY \"storyQualityScore\" DESC;"
echo ""

echo "📊 STEP 6: Summary Statistics"
echo "----------------------------"
docker exec linda_backend-postgres-1 psql -U linda -d linda -c "
SELECT
  (SELECT COUNT(*) FROM \"Memory\" WHERE \"residentId\" = '$RESIDENT_ID') as total_memories,
  (SELECT COUNT(*) FROM \"StorySegment\" WHERE \"callId\" = '$CALL_ID') as total_segments,
  (SELECT COUNT(*) FROM \"StorySegment\" WHERE \"callId\" = '$CALL_ID' AND \"storyQualityScore\" > 0.7) as high_quality_segments,
  (SELECT COUNT(*) FROM \"StorySegment\" WHERE \"callId\" = '$CALL_ID' AND \"audioClipStatus\" = 'completed') as clips_extracted;"
echo ""

echo "✅ Test complete! If segments exist, you can now:"
echo "1. View segments: curl http://localhost:3000/api/segments?residentId=$RESIDENT_ID"
echo "2. Create lifebook: See instructions below"
echo ""
