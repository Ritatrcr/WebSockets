flowchart LR
  %% ===== Subsystems =====
  subgraph B[Backlog de features]
    BL[Backlog]
    MB[Meta_backlog]
    FE[Factor_eficiencia]
    RN[Ritmo_neto]
    TL[Tasa_llegada]
    TEF[Tiempo_efectivo]
    SLA[SLA_ratio]
    CAL[Calidad]
  end

  subgraph C[Clientes]
    POT[Clientes potenciales]
    CLI[Clientes (adoptantes)]
    TA[Tasa_adopción]
    TR[Tasa_cancelación (churn)]
    WOM[Adopción por recomendación]
  end

  subgraph F[Finanzas]
    MRR[Ingresos mensuales]
    CASH[Saldo en caja]
    CO[Costo operacional]
    SM[Sueldos mensuales]
    GF[Gastos fijos]
    BR[Burn_mensual]
    RW[Runway]
    PM[Precio mensual]
    CPC[Costo por cliente]
  end

  subgraph E[Empleados & Bienestar]
    EMP[Empleados]
    CAP[Capacidad_equipo]
    BW[Bienestar del equipo]
    HI[Contrataciones]
    OUT[Salidas de empleados]
    UTI[Utilización]
  end

  subgraph P[Objetivo & Presión]
    MRRobj[Meta de ingresos (MRR objetivo)]
    PINV[Presión de inversores]
  end

  %% ===== Inside Backlog =====
  CAP -->|+| RN
  FE -->|+| RN
  RN -->|−| BL
  TL -->|+| BL
  BL -->|+ (exceso)| TEF
  TEF -->|+| SLA
  SLA -->|−| CAL
  MB -->|referencia| BL

  %% ===== Clientes =====
  TA -->|+| CLI
  TR -->|+| POT
  CLI -->|+| MRR
  CAL -->|+| WOM
  WOM -->|+| TA
  CLI -->|−| POT
  CLI -->|+| TR:::weak
  classDef weak fill:#fff,stroke:#bbb,color:#555,stroke-dasharray:3 3;

  %% ===== Finanzas =====
  CLI -->|+| MRR
  PM -->|+| MRR
  MRR -->|−| BR
  GF -->|+| BR
  SM -->|+| BR
  CO -->|+| BR
  BR -->|−| RW
  MRR -->|+| CASH
  BR -->|−| CASH
  CLI -->|+| CO
  CPC -->|+| CO

  %% ===== Empleados & Bienestar =====
  EMP -->|+| CAP
  BW -->|+| FE
  EMP -->|+| SM
  HI -->|+| EMP
  OUT -->|−| EMP

  %% ===== Couplings between subsystems =====
  %% Backlog -> Clientes (calidad & churn)
  CAL -->|−| TR
  CAL -->|+| WOM

  %% Empleados/Bienestar -> Backlog (eficiencia)
  UTI -->|−| BW
  UTI -->|−| FE
  CAP -->|− (cubre)| UTI
  TL -->|+ (demanda)| UTI
  CLI -->|+ (soporte)| UTI

  %% Finanzas -> Empleados (contrataciones según caja/presión)
  CASH -->|+ (factor caja)| HI
  PINV -->|+ (horas extra)| UTI
  PINV -->|+ (apetito de hiring)| HI
flowchart LR
  %% ===== Subsystems =====
  subgraph B[Backlog de features]
    BL[Backlog]
    MB[Meta_backlog]
    FE[Factor_eficiencia]
    RN[Ritmo_neto]
    TL[Tasa_llegada]
    TEF[Tiempo_efectivo]
    SLA[SLA_ratio]
    CAL[Calidad]
  end

  subgraph C[Clientes]
    POT[Clientes potenciales]
    CLI[Clientes (adoptantes)]
    TA[Tasa_adopción]
    TR[Tasa_cancelación (churn)]
    WOM[Adopción por recomendación]
  end

  subgraph F[Finanzas]
    MRR[Ingresos mensuales]
    CASH[Saldo en caja]
    CO[Costo operacional]
    SM[Sueldos mensuales]
    GF[Gastos fijos]
    BR[Burn_mensual]
    RW[Runway]
    PM[Precio mensual]
    CPC[Costo por cliente]
  end

  subgraph E[Empleados & Bienestar]
    EMP[Empleados]
    CAP[Capacidad_equipo]
    BW[Bienestar del equipo]
    HI[Contrataciones]
    OUT[Salidas de empleados]
    UTI[Utilización]
  end

  subgraph P[Objetivo & Presión]
    MRRobj[Meta de ingresos (MRR objetivo)]
    PINV[Presión de inversores]
  end

  %% ===== Inside Backlog =====
  CAP -->|+| RN
  FE -->|+| RN
  RN -->|−| BL
  TL -->|+| BL
  BL -->|+ (exceso)| TEF
  TEF -->|+| SLA
  SLA -->|−| CAL
  MB -->|referencia| BL

  %% ===== Clientes =====
  TA -->|+| CLI
  TR -->|+| POT
  CLI -->|+| MRR
  CAL -->|+| WOM
  WOM -->|+| TA
  CLI -->|−| POT
  CLI -->|+| TR:::weak
  classDef weak fill:#fff,stroke:#bbb,color:#555,stroke-dasharray:3 3;

  %% ===== Finanzas =====
  CLI -->|+| MRR
  PM -->|+| MRR
  MRR -->|−| BR
  GF -->|+| BR
  SM -->|+| BR
  CO -->|+| BR
  BR -->|−| RW
  MRR -->|+| CASH
  BR -->|−| CASH
  CLI -->|+| CO
  CPC -->|+| CO

  %% ===== Empleados & Bienestar =====
  EMP -->|+| CAP
  BW -->|+| FE
  EMP -->|+| SM
  HI -->|+| EMP
  OUT -->|−| EMP

  %% ===== Couplings between subsystems =====
  %% Backlog -> Clientes (calidad & churn)
  CAL -->|−| TR
  CAL -->|+| WOM

  %% Empleados/Bienestar -> Backlog (eficiencia)
  UTI -->|−| BW
  UTI -->|−| FE
  CAP -->|− (cubre)| UTI
  TL -->|+ (demanda)| UTI
  CLI -->|+ (soporte)| UTI

  %% Finanzas -> Empleados (contrataciones según caja/presión)
  CASH -->|+ (factor caja)| HI
  PINV -->|+ (horas extra)| UTI
  PINV -->|+ (apetito de hiring)| HI

  %% Clientes -> Finanzas -> Presión
  MRRobj --> PINV
  MRR -->|− (gap)| PINV

  %% Backlog -> Presión indirecta (por calidad->MRR)
  BL -->|− via Calidad| MRR

  %% Presión -> Bienestar y Salidas
  PINV -->|+| OUT
  PINV -->|−| BW

  %% Runway -> Presión (opcional)
  RW -->|− (colchón)| PINV

  %% Aesthetics
  classDef cluster fill:#f7f7f7,stroke:#ccc,stroke-width:1px;
  class B,C,F,E,P cluster;

  %% Clientes -> Finanzas -> Presión
  MRRobj --> PINV
  MRR -->|− (gap)| PINV

  %% Backlog -> Presión indirecta (por calidad->MRR)
  BL -->|− via Calidad| MRR

  %% Presión -> Bienestar y Salidas
  PINV -->|+| OUT
  PINV -->|−| BW

  %% Runway -> Presión (opcional)
  RW -->|− (colchón)| PINV

  %% Aesthetics
  classDef cluster fill:#f7f7f7,stroke:#ccc,stroke-width:1px;
  class B,C,F,E,P cluster;
