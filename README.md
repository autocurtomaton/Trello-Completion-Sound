# Trello-Completion-Sound
Generate a sound upon moving a Trello card to a Completed list.

Sadly, Trello does not natively make a sound when completing tasks, nor do they offer any option for this that I could find. Since I think it's nice to have a pleasing audio cue for completing something, I created a method to play a chosen sound with the help of tampermonkey injection. The script looks for a card moving to a particular "done" list. Butler button automations also work provided they're moving to the same list name. The sound should play in browser or PWA scenarios.

Requirements:
- Installation of tampermonkey extension (requires Chrome or compatible browser)
- List ID of target list (use devtools to find the ID as you move a test card)
