# YDK File Structure

## Overview

`.ydk` files are plain text files used by Yu-Gi-Oh! deck building applications (like YGOPro, EDOPro, Dueling Book) to store deck information. They contain card IDs that reference specific Yu-Gi-Oh! cards.

## File Format

A `.ydk` file consists of three main sections separated by section headers:

```
#created by ...
#main
<card_id>
<card_id>
...
#extra
<card_id>
<card_id>
...
!side
<card_id>
<card_id>
...
```

### Section Headers

- `#main` - Denotes the start of the main deck section
- `#extra` - Denotes the start of the extra deck section
- `!side` - Denotes the start of the side deck section

**Note**: The side deck section uses `!side` (exclamation mark) instead of `#side`

### Comments

Lines starting with `#` (except for section headers) or `!` (except `!side`) are treated as comments and are ignored by parsers.

The first line is typically a comment indicating which application created the file:
```
#created by YGOPro
```

## Card IDs

Each card is represented by a unique numeric ID (also known as a "passcode") that corresponds to a specific Yu-Gi-Oh! card. These IDs are typically 8 digits long.

Example card IDs:
- `20932152` - Rescue Rabbit
- `26202165` - Pot of Desires
- `79229522` - Apollousa, Bow of the Goddess

Multiple copies of the same card are represented by listing the ID multiple times (one per line).

## Deck Rules

Yu-Gi-Oh! has the following deck construction rules:

### Main Deck
- **Minimum**: 40 cards
- **Maximum**: 60 cards
- Contains Monster, Spell, and Trap cards

### Extra Deck
- **Minimum**: 0 cards
- **Maximum**: 15 cards
- Contains Fusion, Synchro, Xyz, and Link monsters

### Side Deck
- **Minimum**: 0 cards
- **Maximum**: 15 cards
- Used between duels in matches to swap cards with main/extra deck

## Example File

Here's a complete example of a `.ydk` file:

```
#created by EDOPro
#main
20932152
20932152
20932152
9748752
9748752
9596126
26202165
5220687
41420027
10028593
10028593
10028593
71564252
71564252
15341821
15341821
11747708
15310033
84749824
97268402
97268402
97268402
21502796
21502796
44330098
98777036
14943837
85087012
53582587
5318639
5318639
5318639
14087893
14087893
96363153
96363153
67169062
81439173
44095762
70342110
70342110
#extra
79229522
50091196
90953320
52687916
44508094
76774528
25862681
19974580
3429238
3429238
46195773
18013090
7391448
26593852
45815891
!side
24508238
24508238
24508238
70095154
70095154
70095154
51119924
51119924
51119924
73125233
1224927
60082869
60082869
71044499
71044499
```

In this example:
- **Main Deck**: 43 cards (including 3 copies each of cards 20932152 and 10028593)
- **Extra Deck**: 15 cards (including 2 copies of card 3429238)
- **Side Deck**: 15 cards

## Parsing Notes

When parsing `.ydk` files:

1. **Line-by-line processing**: Read the file line by line
2. **Section tracking**: Keep track of the current section (#main, #extra, !side)
3. **Skip invalid lines**: Ignore comments, empty lines, and lines that aren't valid card IDs
4. **Card ID validation**: Ensure card IDs are positive integers
5. **Deck validation**: Verify the deck meets construction rules (40-60 main, 0-15 extra/side)

## Integration with prog-hub

In this application:

- Users upload `.ydk` files via the Decklist Submission page
- The `ydkParser.ts` utility parses and validates the file
- Card IDs are stored in the database as JSON arrays in the `decklists` table
- Card IDs are converted from numbers to strings for database storage (MySQL JSON compatibility)

---

# LFLIST (Limit/Forbidden List) File Structure

## Overview

`.lflist.conf` files are plain text files used by Yu-Gi-Oh! simulators (like YGOPro, EDOPro) to define banlist restrictions. They specify which cards are forbidden, limited, or semi-limited in a particular format.

## File Format

An `.lflist.conf` file consists of a banlist name followed by sections for each restriction level:

```
!banlist_name
#forbidden
<card_id> 0 --Card Name
<card_id> 0 --Card Name
...
#limited
<card_id> 1 --Card Name
<card_id> 1 --Card Name
...
#semi-limited
<card_id> 2 --Card Name
<card_id> 2 --Card Name
...
```

### File Structure Components

1. **Banlist Name**: Starts with `!` followed by the name (e.g., `!prog`)
2. **Section Headers**:
   - `#forbidden` - Cards banned from use (0 copies allowed)
   - `#limited` - Cards limited to 1 copy per deck
   - `#semi-limited` - Cards limited to 2 copies per deck
3. **Card Entries**: Format is `<card_id> <quantity> --<optional comment>`
   - Card ID: 8-digit card passcode
   - Quantity: 0 (forbidden), 1 (limited), or 2 (semi-limited)
   - Comment: Optional card name (preceded by `--`)

### Restriction Levels

| Level | Quantity | Meaning |
|-------|----------|---------|
| Forbidden | 0 | Card cannot be used in the deck at all |
| Limited | 1 | Only 1 copy allowed in main + side deck combined |
| Semi-Limited | 2 | Only 2 copies allowed in main + side deck combined |
| Unlimited | 3 | Standard 3 copies allowed (not listed in file) |

**Note**: Cards not listed in the banlist file are considered "Unlimited" (3 copies allowed).

## Example Section

```
#forbidden
82301904 0 --Chaos Emperor Dragon - Envoy of the End
17330916 0 --Performapal Monkeyboard
91020571 0 --Reactan, Dragon Ruler of Pebbles

#limited
72989439 1 --Black Luster Soldier - Envoy of the Beginning
31178212 1 --Majespecter Unicorn - Kirin
92746535 1 --Luster Pendulum, the Dracoslayer

#semi-limited
29401950 2 --Bottomless Trap Hole
94192409 2 --Compulsory Evacuation Device
```

## Comments

- Lines starting with `!` (except the banlist name) are comments
- Inline comments after `--` provide card names for human readability
- Comments are ignored by parsers but helpful for manual editing

## Integration with prog-hub

In this application:

- Banlists are stored in the `banlists` table with four JSON arrays:
  - `banned`: Array of forbidden card IDs (0 copies)
  - `limited`: Array of limited card IDs (1 copy)
  - `semilimited`: Array of semi-limited card IDs (2 copies)
  - `unlimited`: Array of cards moved from restricted to unlimited
- Each banlist is associated with a specific session
- Players vote on banlist suggestions which determine the next session's banlist
- The `prog.lflist.conf` file serves as a reference example

### Database Storage

Card IDs are stored as strings in JSON arrays:
```json
{
  "banned": ["82301904", "17330916", "91020571"],
  "limited": ["72989439", "31178212", "92746535"],
  "semilimited": ["29401950", "94192409"],
  "unlimited": []
}
```

## Parsing Notes

When parsing `.lflist.conf` files:

1. **First line**: Extract banlist name (remove `!` prefix)
2. **Section tracking**: Identify current section (#forbidden, #limited, #semi-limited)
3. **Card parsing**: Extract card ID and quantity from each line
4. **Comment handling**: Strip inline comments (everything after `--`)
5. **Validation**: Ensure quantities match section (0 for forbidden, 1 for limited, 2 for semi-limited)

## Progression Series Format

The `prog.lflist.conf` file represents the progression series format used by this application. Key characteristics:

- More restrictive than official formats
- Includes powerful cards from various eras
- Balanced for competitive progression gameplay
- Evolves based on player voting and tournament results

## Resources

- [Yu-Gi-Oh! Card Database](https://www.db.yugioh-card.com/yugiohdb/) - Official card database
- [YGOPRODECK API](https://ygoprodeck.com/api-guide/) - API for card information by ID
- [Official TCG Forbidden & Limited Lists](https://www.yugioh-card.com/en/limited/) - Reference for official formats
