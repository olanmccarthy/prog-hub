# Action Flow
This will show how the prog is performed.

None of these steps can be performed until the previous has been completed
1. Admin starts the session
2. Users submit their decklists for the session
3. Prog event wheel is spun (optional, can affect tournament rules)
4. Admin generates pairings (must happen after event wheel is spun)
5. Players play their games on Dueling Book
6. Players submit their scores until all games have been played
7. Standings get finalised
8. Victory Point is assigned via passdown system
9. Dollarydoos (wallet points) get assigned depending on who got the victory point
10. Decklists are made public
11. Players make their banlist suggestions
12. Players each cast minimum 2 votes on banlist suggestions
13. Moderator is chosen
14. Moderator chooses which banlist to make legal for the next session
15. Session is marked as complete

## Detailed View from Backend

### 1. Admin starts the session
- First session in db that is not marked as complete is set as active session
- Session fields updated: `active=true`, `date=NOW()`
- **Validation**: Next session must have a banlist created

### 2. Players submit their decklists for the session
- All players must submit a decklist to database via `/play/decklist`
- Decklists validated against active session's banlist
- **Requirement**: Must be completed before event wheel can be spun

### 3. Prog event wheel is spun (OPTIONAL)
- Admin spins the wheel at `/admin/event-wheel`
- Session gets `eventWheelSpun=true` marked in database
- Selected event affects tournament rules/gameplay
- Can include "No Event" if probabilities don't sum to 100%
- **Validation**: All players must have submitted decklists first
- **One-time only**: Cannot be spun again for the same session

### 4. Admin generates pairings
- Admin clicks "Generate Pairings" button at `/admin/prog_actions`
- Round-robin pairings are generated for all players with randomization
- Discord notification sent with all pairings for all rounds
- **Validation**: Event wheel must have been spun first
- **One-time only**: Cannot be generated again for the same session

### 5. Players play their games on Dueling Book
- Players use the pairings generated in step 4
- Play matches externally (not tracked in this application)

### 6. Players submit their scores until all games have been played
- Players/admins report match results at `/play/pairings`
- Add win counts to the pairing entries (player1wins, player2wins)
- Continue until all matches in all rounds are complete

### 7. Standings get finalised
- Admin finalizes standings at `/play/standings`
- Rankings calculated with tiebreakers: Match Wins → Game Wins → OMW%
- Top 6 placements populated (first, second, third, fourth, fifth, sixth)
- Discord notification sent with final standings
- **Requirement**: Must be completed before victory points can be assigned

### 8. Victory Point is assigned via passdown system
- Admin goes to `/admin/victory-point-assignment`
- Starting from 1st place, each player is offered the victory point
- Player can "Take VP" or "Pass" to next player
- If all pass, last place automatically receives the victory point
- Session gets `victoryPointsAssigned=true` marked in database
- **Validation**: Standings must be finalized (all placements filled)
- **Requirement**: Must be completed before session can be marked complete

### 9. Dollarydoos (wallet points) get assigned
- Happens automatically when victory point is assigned
- All players EXCEPT last place and the VP taker receive wallet points
- Amounts based on active `WalletPointBreakdown` configuration
- `WalletTransaction` records created with type "VICTORY_POINT_AWARD"
- Session gets `walletPointsAssigned=true` marked in database
- Last place (6th) receives no wallet points regardless

### 10. Decklists are made public
- After standings are finalized, all decklists become viewable
- Players can view each other's deck compositions

### 11. Players make their banlist suggestions
- Players submit suggestions at `/banlist/suggestion`
- Each creates an entry in banlist_suggestions table
- Suggestions include changes: banned, limited, semilimited, unlimited
- **Requirement**: All players must submit before session can be marked complete

### 12. Players each cast minimum 2 votes on banlist suggestions
- Players vote at `/banlist/voting`
- Each vote creates an entry in the banlist_suggestion_votes table
- Cannot vote for their own suggestion
- Minimum 2 votes required per player

### 13. Moderator is chosen
- Admin goes to `/admin/moderator-selection`
- Admin selects which players are eligible (all by default except last session's moderator)
- Admin spins wheel to randomly select moderator
- Each eligible player has equal chance of being chosen
- Session gets `moderatorId` set in database
- **Validation**: All players must have voted on banlist suggestions
- **Requirement**: Must be completed before session can be marked complete

### 14. Moderator chooses which banlist to make legal for the next session
- Only the selected moderator can access this functionality at `/banlist/voting`
- Moderator views all suggestions that received 2+ votes
- Moderator selects winning suggestion with crown icon
- New banlist entry is automatically created for next session (sessionId + 1)
- Banlist merging logic:
  - Cards mentioned in winning suggestion move to new categories
  - Cards not mentioned stay in current categories
  - New cards from suggestion are added
- Selected suggestion marked with `chosen=true`
- Previous session's banlist can be deleted and reselected if moderator changes mind

### 15. Session is marked as complete
- Admin completes session at `/admin/prog_actions`
- Session fields updated: `complete=true`, `active=false`
- **Validation checks**:
  - All placements (1st-6th) filled ✅
  - All decklists submitted ✅
  - Event wheel spun ✅
  - Victory points assigned ✅
  - Wallet points assigned ✅
  - All banlist suggestions submitted ✅
  - Moderator selected ✅
  - (Future: Winning banlist confirmed)

## Additional Features (Can be used anytime during/after session)

### Loser Prizing Wheel
- Located at `/admin/loser-prizing`
- Can be spun multiple times (no session tracking)
- Awards consolation prizes to players who didn't place top 6
- Independent of main session flow

## Current Implementation Status

All core features are now fully implemented:

1. ✅ **Banlist Voting System** (Step 11) - Fully functional with vote submission and tracking
2. ✅ **Moderator Selection** (Step 12) - Random wheel selection with eligibility controls
3. ✅ **Moderator Banlist Choice** (Step 13) - Fully functional with automatic banlist merging
4. ✅ **Complete Session Validation** (Step 14) - All checks implemented:
   - All placements (1st-6th) filled ✅
   - All decklists submitted ✅
   - Event wheel spun ✅
   - Victory points assigned ✅
   - Wallet points assigned ✅
   - All banlist suggestions submitted ✅
   - Moderator selected ✅

### Future Enhancements:
- Add validation to check if winning banlist has been confirmed before completing session
- Add admin pages to manage event wheel entries and loser prizing entries
- Add admin page to manage wallet point breakdown configurations