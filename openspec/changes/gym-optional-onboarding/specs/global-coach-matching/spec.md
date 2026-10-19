## Purpose

Permite que un miembro sin gimnasio pueda buscar y aceptar un coach, y define cómo cambia la elegibilidad cuando se vincula a un gimnasio.

## ADDED Requirements

### Requirement: Coach para miembro sin gimnasio
Un miembro con `gymId = null` SHALL poder buscar trainers activos de cualquier gimnasio y enviarles una solicitud. El trainer SHALL poder aceptar o rechazar la solicitud; la aceptación SHALL vincularlo como coach.

#### Scenario: Miembro sin gym busca coach
- **WHEN** un miembro sin gimnasio busca un trainer por nombre
- **THEN** puede ver trainers de gimnasios activos y enviar una solicitud

#### Scenario: Trainer acepta solicitud de miembro sin gym
- **WHEN** el trainer acepta la solicitud
- **THEN** el miembro queda con `assignedTrainerId` y conserva `gymId = null`

### Requirement: Coach limitado al gimnasio cuando el miembro tiene gym
Un miembro con gimnasio SHALL solo poder vincularse a trainers de su mismo gimnasio. Un trainer SHALL solo poder solicitar o aceptar miembros de su gym; la excepción es un miembro sin gym, que es elegible globalmente.

#### Scenario: Trainer de otro gym
- **WHEN** un trainer de gym A intenta solicitar a un miembro del gym B
- **THEN** la operación devuelve 403/404

#### Scenario: Miembro sin gym
- **WHEN** un trainer de gym A solicita a un miembro con `gymId = null`
- **THEN** la solicitud se permite aunque el miembro no tenga gym

### Requirement: Cambio de coach
Un miembro con coach asignado SHALL poder solicitar un cambio; el nuevo coach o el gym SHALL aprobarlo. El coach actual SHALL mantenerse hasta la aprobación.

#### Scenario: Cambio de coach pendiente
- **WHEN** el miembro solicita otro coach
- **THEN** su coach actual sigue asignado hasta que la solicitud se apruebe
