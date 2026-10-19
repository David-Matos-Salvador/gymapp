## Purpose

Define el catálogo por defecto para que un miembro sin gimnasio vea equipamiento, máquinas y ejercicios utilizables, sin mezclarlo con la operación de un gimnasio real.

## ADDED Requirements

### Requirement: Gimnasio por defecto único
El sistema SHALL tener como máximo un gimnasio con `isDefault = true`. Ese gimnasio SHALL tener `address = null` y SHALL estar activo.

#### Scenario: Seed del gimnasio por defecto
- **WHEN** se ejecuta el seed
- **THEN** existe exactamente un gimnasio por defecto activo y sin local

### Requirement: Fallback de equipamiento
La resolución de equipamiento SHALL usar primero la configuración del gimnasio del miembro. Si el miembro no tiene gimnasio, o su gimnasio no tiene activación para un equipo, SHALL usar la configuración del gimnasio por defecto. Si tampoco existe, SHALL mostrar el catálogo genérico.

#### Scenario: Miembro con gimnasio configurado
- **WHEN** un miembro con gimnasio abre una rutina
- **THEN** ve las máquinas activas y los números configurados para su gimnasio

#### Scenario: Miembro sin gimnasio
- **WHEN** un miembro con `gymId = null` abre una rutina
- **THEN** ve las máquinas del gimnasio por defecto

#### Scenario: Equipo sin activación en el gimnasio del miembro
- **WHEN** un equipo no está activado en el gimnasio del miembro pero sí en el gimnasio por defecto
- **THEN** se usa la configuración del gimnasio por defecto para ese equipo

### Requirement: Números de máquina
Los números de máquina SHALL mostrarse solo cuando el gimnasio efectivo tenga `showMachineNumbers = true`; si no, SHALL mostrarse el nombre del equipo sin número.

#### Scenario: Números configurados
- **WHEN** el gimnasio efectivo tiene `showMachineNumbers = true` y una máquina tiene número
- **THEN** la rutina muestra el número junto al equipo

#### Scenario: Números desactivados
- **WHEN** el gimnasio efectivo tiene `showMachineNumbers = false`
- **THEN** la rutina no muestra números de máquina

### Requirement: Catálogo de ejercicios por defecto
El catálogo de ejercicios para un miembro sin gimnasio SHALL resolverse con las activaciones del gimnasio por defecto y SHALL NOT exponer ejercicios desactivados.

#### Scenario: Rutina de miembro sin gimnasio
- **WHEN** un miembro sin gimnasio entrena una rutina
- **THEN** solo ve ejercicios activos en el gimnasio por defecto

### Requirement: Separación del gimnasio por defecto
El gimnasio por defecto SHALL NOT aceptar membresías, planes, clases, invitaciones ni reservas, y SHALL NOT aparecer como gimnasio del miembro en el perfil.

#### Scenario: Operaciones de gimnasio real
- **WHEN** se intenta crear un plan, clase o membresía asociada al gimnasio por defecto
- **THEN** la operación se rechaza
