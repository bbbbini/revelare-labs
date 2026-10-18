# Research room logo fonts

Roboto Regular (400) and Bold (700), unmodified hinted TrueType files,
version 2.001047, from the Google Fonts Roboto 2 repository.
Copyright 2015 Google Inc. All Rights Reserved.
Distributed under Apache License 2.0; see `LICENSE-Roboto.txt`.

Source repository: https://github.com/googlefonts/roboto-2

- Regular: https://github.com/googlefonts/roboto-2/blob/main/src/hinted/Roboto-Regular.ttf
- Bold: https://github.com/googlefonts/roboto-2/blob/main/src/hinted/Roboto-Bold.ttf
- License source: https://github.com/googlefonts/roboto-2/blob/main/LICENSE

The research room's two Latin logo labels use these local files explicitly.
They do not rely on the text renderer's external Unicode fallback for their glyphs.

# Office label font

`IBMPlexSansKR-Regular.ttf` is the unmodified hinted TrueType file of
IBM Plex Sans KR Regular, version 1.003, from IBM's official Plex repository
(commit 71f558992315a12ca1f06a2215d57962a1992162).
Copyright 2018 IBM Corp., with Reserved Font Name "Plex".
Distributed under the SIL Open Font License 1.1; see `LICENSE-IBMPlexSansKR.txt`.

- Font: https://github.com/IBM/plex/blob/71f558992315a12ca1f06a2215d57962a1992162/packages/plex-sans-kr/fonts/complete/ttf/hinted/IBMPlexSansKR-Regular.ttf
- License: https://github.com/IBM/plex/blob/71f558992315a12ca1f06a2215d57962a1992162/packages/plex-sans-kr/LICENSE.txt

It covers all 11,172 Hangul syllables, Latin and digits. 3D labels in the office
scenes use it by default (`LocalText`), so they do not fetch the text renderer's
external Unicode fallback. Characters outside the font, such as emoji in a live
message, would still need that fallback.
