#!/bin/bash

# Lifebook API Testing Script
# Run this after the call has been processed

RESIDENT_ID="c2f92365-ede6-48e0-a56f-90503b5159c5"
BASE_URL="http://localhost:3000/api"

echo "🧪 LIFEBOOK API TESTING"
echo "======================="
echo ""

echo "📖 TEST 1: List Story Segments"
echo "------------------------------"
echo "GET /api/segments?residentId=$RESIDENT_ID"
curl -s "$BASE_URL/segments?residentId=$RESIDENT_ID" | jq '
.[] | {
  id: .id,
  quality: .storyQualityScore,
  category: .category,
  tone: .emotionalTone,
  audioStatus: .audioClipStatus,
  preview: .transcriptText[0:80]
}'
echo ""
echo ""

echo "👍 TEST 2: Star a Segment (pick the ID from above)"
echo "------------------------------------------------"
echo "You'll need to manually run:"
echo "SEGMENT_ID=\"<paste-segment-id-here>\""
echo "curl -X PATCH $BASE_URL/segments/\$SEGMENT_ID \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"isStarred\": true, \"staffNotes\": \"Beautiful memory\"}'"
echo ""
echo ""

echo "📚 TEST 3: Create Lifebook for Michael"
echo "-------------------------------------"
echo "POST /api/lifebooks"
BOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/lifebooks" \
  -H "Content-Type: application/json" \
  -d "{
    \"residentId\": \"$RESIDENT_ID\",
    \"title\": \"Michael's Life Story\",
    \"tier\": \"standard\",
    \"familyName\": \"Sarah (daughter)\",
    \"familyEmail\": \"sarah@example.com\"
  }")

echo "$BOOK_RESPONSE" | jq '.'
BOOK_ID=$(echo "$BOOK_RESPONSE" | jq -r '.id // empty')

if [ -n "$BOOK_ID" ]; then
  echo ""
  echo "✅ Lifebook created! ID: $BOOK_ID"
  echo ""

  echo "📑 TEST 4: Create Chapter"
  echo "------------------------"
  echo "POST /api/lifebooks/$BOOK_ID/chapters"
  CHAPTER_RESPONSE=$(curl -s -X POST "$BASE_URL/lifebooks/$BOOK_ID/chapters" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Family & Memories",
      "description": "Stories about Michael'\''s family and childhood",
      "orderIndex": 1
    }')

  echo "$CHAPTER_RESPONSE" | jq '.'
  CHAPTER_ID=$(echo "$CHAPTER_RESPONSE" | jq -r '.id // empty')

  if [ -n "$CHAPTER_ID" ]; then
    echo ""
    echo "✅ Chapter created! ID: $CHAPTER_ID"
    echo ""

    echo "📝 TEST 5: Add Segment to Chapter"
    echo "--------------------------------"
    echo "You need to manually get a segment ID and run:"
    echo "SEGMENT_ID=\"<paste-segment-id-here>\""
    echo "curl -X POST $BASE_URL/lifebooks/chapters/$CHAPTER_ID/entries \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{
      \"segmentId\": \"\$SEGMENT_ID\",
      \"title\": \"Fishing with Dad\",
      \"orderIndex\": 1
    }'"
    echo ""
    echo ""

    echo "👁️  TEST 6: View Complete Lifebook (Family View)"
    echo "----------------------------------------------"
    echo "GET /api/lifebooks/resident/$RESIDENT_ID"
    curl -s "$BASE_URL/lifebooks/resident/$RESIDENT_ID" | jq '{
      title: .title,
      status: .status,
      resident: .resident.firstName,
      chapters: .chapters | length,
      firstChapter: .chapters[0] | {
        title: .title,
        entries: .entries | length,
        firstEntry: .entries[0] | {
          title: .title,
          audioUrl: .segment.audioClipUrl,
          transcriptPreview: .segment.transcriptText[0:100]
        }
      }
    }'
    echo ""
  fi
fi

echo ""
echo "✅ API Testing Complete!"
echo ""
echo "Full lifebook URL: $BASE_URL/lifebooks/resident/$RESIDENT_ID"
echo ""
