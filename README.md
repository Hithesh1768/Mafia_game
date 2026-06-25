# Mafia Game Backend

Multiplayer Mafia game backend built using Spring Boot and JWT authentication.

## Features
- Player registration & login
- Secure JWT authentication
- Night/Day phase automation
- Role assignment (Mafia, Doctor, Citizen)
- Night actions & day voting
- Win condition detection


## Game Flow
LOBBY → NIGHT → DAY → NIGHT → ... → WIN → RETURN TO LOBBY

## Technologies
Spring Boot, JPA, Hibernate, JWT, Maven

## How to Run
1. Clone the repo
2. Open in IntelliJ
3. Configure DB in `application.properties`
4. Run the application



---

##  API Endpoints

###  Authentication

| Endpoint | Method | Description |
|---------|--------|------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login & receive JWT |

###  Player & Lobby

| Endpoint | Method | Description |
|---------|--------|------------|
| `/player/join` | POST | Join current lobby |
| `/player/me` | GET | View current player info |
| `/game/players` | GET | View lobby players |

###  Game Control

| Endpoint | Method | Description |
|---------|--------|------------|
| `/game/start` | POST | Start the game |
| `/game/reset` | POST | Reset & return to lobby |

### 🌙 Night Phase

| Endpoint | Method | Description |
|---------|--------|------------|
| `/night/action` | POST | Submit night action |
| `/night/resolve` | POST | Resolve night manually |

### ☀️ Day Phase

| Endpoint | Method | Description |
|---------|--------|------------|
| `/day/start` | GET | Begin day & show night result |
| `/day/vote` | POST | Vote to eliminate player |

---

##  Role Permissions

| Role | Allowed Actions |
|-----|----------------|
| Mafia | Kill at night |
| Doctor | Save at night |
| Citizen | Vote during day |
| Host | Start / Reset game |

---

###  Host System
- Host designation for each lobby
- Only host can:
    - Start the game
    - Reset the game
    - Kick players

##  Win Conditions

- **Citizens win** when all Mafia are eliminated
- **Mafia win** when Mafia ≥ Citizens

---

---

## Roadmap — Upcoming Features

The following features are **actively planned** and will be implemented next:



###  Multi-Lobby Support
- Multiple lobbies running in parallel
- Players can:
    - Create new lobby
    - Join existing lobby
- Each lobby maintains its own:
    - Player list
    - Game state
    - Night/Day cycle

### Return to Lobby (Post-Game)
- After win condition:
    - Game resets to lobby state
    - Players remain connected
    - Roles & alive status reset
    - New players may join
    - Host can start a new round without rejoining

###  Expanded Roles
- Multiple Mafia
- Multiple Doctors
- Special roles planned:
    - Detective
    - Vigilante
    - Guardian
