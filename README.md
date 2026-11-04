# WayrapassWebapp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.24.

## US01 frontend mock

La autenticación de esta etapa funciona completamente en Angular y no requiere backend, PostgreSQL ni endpoints `/api/**`.

| Rol | Correo demo | Contraseña |
| --- | --- | --- |
| Estudiante | `student@wayrapass.com` | `WayraPass2026!` |
| Familiar | `family@wayrapass.com` | `WayraPass2026!` |
| Chofer | `driver@wayrapass.com` | `WayraPass2026!` |
| Coordinador | `coordinator@wayrapass.com` | `WayraPass2026!` |

Los registros y cambios de contraseña se guardan localmente en el navegador. El registro público solo admite cuentas de estudiante y familiar; las cuentas de chofer y coordinador son previamente habilitadas.

#### Estado del frontend

El frontend actualmente incluye la simulación de autenticación y acceso según rol. Las demás historias de usuario y el prototipo interactivo continúan en desarrollo.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
