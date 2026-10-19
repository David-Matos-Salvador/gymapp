## Purpose

Permite que una persona use la app sin pertenecer a un gimnasio y que, durante el onboarding, se vincule a un gimnasio real si corresponde, sin asignaciones arbitrarias.

## ADDED Requirements

### Requirement: Registro sin gimnasio

El sistema SHALL permitir crear una cuenta `MEMBER` sin gimnasio. Si el registro incluye un link o slug de gimnasio válido, SHALL asignar ese gimnasio; si no, SHALL dejar `gymId` nulo.

#### Scenario: Registro público sin link

- **WHEN** una persona se registra sin `gymSlug`
- **THEN** la cuenta se crea con `gymId = null` y puede iniciar sesión

#### Scenario: Registro con link de gimnasio

- **WHEN** una persona se registra con un `gymSlug` activo
- **THEN** la cuenta se crea con ese `gymId`

#### Scenario: Link de gimnasio inválido

- **WHEN** una persona se registra con un `gymSlug` inexistente o inactivo
- **THEN** el registro devuelve 400 y no crea la cuenta

### Requirement: Pregunta de gimnasio en onboarding

El onboarding SHALL preguntar si la persona está relacionada con un gimnasio. Si responde que sí, SHALL permitir buscar gimnasios reales activos por nombre o slug y vincularse al elegido. Si responde que no, SHALL continuar sin `gymId`.

#### Scenario: El miembro elige un gimnasio

- **WHEN** el miembro busca un gimnasio activo y lo selecciona en onboarding
- **THEN** su `gymId` queda asignado a ese gimnasio

#### Scenario: El miembro no tiene gimnasio

- **WHEN** el miembro indica que no está relacionado con un gimnasio
- **THEN** el onboarding continúa con `gymId = null` y el catálogo por defecto

#### Scenario: Vinculación directa

- **WHEN** el miembro selecciona un gimnasio real
- **THEN** la vinculación se aplica sin requerir aprobación del dueño

### Requirement: Link o invitación de gimnasio

Un link o invitación de gimnasio SHALL preseleccionar el gimnasio y SHALL omitir la pregunta de onboarding.

#### Scenario: Onboarding desde invitación

- **WHEN** un miembro llega desde un link o invitación de un gimnasio
- **THEN** el onboarding usa ese gimnasio y no muestra la búsqueda

### Requirement: Visibilidad del gimnasio por defecto

El gimnasio por defecto SHALL existir como gimnasio activo especial, SHALL estar oculto de la búsqueda pública y de las invitaciones, y SHALL NOT figurar como gimnasio elegible para vinculación.

#### Scenario: Búsqueda de gimnasios

- **WHEN** un miembro busca gimnasios en onboarding
- **THEN** el gimnasio por defecto no aparece en los resultados

### Requirement: Membresías y clases solo en gimnasios reales

El gimnasio por defecto SHALL NOT ofrecer membresías, planes ni clases. Un miembro sin gimnasio SHALL poder usar rutinas y equipamiento, pero SHALL NOT reservar clases ni comprar membresías hasta vincularse a un gimnasio real.

#### Scenario: Miembro sin gimnasio intenta reservar

- **WHEN** un miembro con `gymId = null` intenta reservar una clase
- **THEN** la operación se rechaza con un mensaje que indica vincular un gimnasio

#### Scenario: Miembro sin gimnasio intenta comprar membresía

- **WHEN** un miembro con `gymId = null` abre membresías o intenta comprar un plan
- **THEN** no se le ofrecen planes y la operación se rechaza
