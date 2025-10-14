# Page Structure

Parent Nodes are pages.
Child Nodes are features.

&#42; Mermaid.js is used to render this graph, Markdown Preview Enhanced is used to view in VSCode
```mermaid
graph TD
  Home --> TODO_List
  Home --> Navigation
  Home --> Decklist_Validator
  Home --> Session_Calendar
  Stats
  Admin --> Player_List
  Admin --> Start_Prog
  Admin --> Basic_MySQL_Operations
```

```mermaid
graph TD
  Banlist --> View_Banlist
  Banlist --> Banlist_History
  Banlist --> Banlist_Submission
  Banlist --> Banlist_Voting
  Play --> Decklist_Submission
  Play --> Pairings_And_Result_Submission
  Play --> Standings
```

## Priority Levels
What functionality needs to be added first

### Essential
- Admin: Start Prog
- Banlist: Banlist Submission
- Banlist: Banlist Voting
- Play: Pairings
- Play: Standings
- Play: Result Submission

### Good to Have
- Banlist: View Banlist

### Would be Nice
- Home: Decklist Validator
- Banlist: Banlist History

### Not Needed
- Stats
- Home: TODO List
- Home: Session Calendar
- Admin: Player List
- Admin: MySQL Operations