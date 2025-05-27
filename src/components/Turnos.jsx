import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase"; // importa configuración

const personas = [
  "Yolanda",
  "Juan Carlos",
  "Diana",
  "Tato",
  "Abelardo",
  "Sebastian",
  "Maria",
  "Monica",
  "Dora",
  "Beatriz",
  "Sonia",
];

const diasDelMes = Array.from({ length: 30 }, (_, i) => i + 1);

const TURNO_M = "M"; // 5 a 8
const TURNO_C = "C"; // 8 a 17
const TURNO_T = "T"; // 17 a 20
const TURNO_N = "N"; // 20 a 5
const TURNO_L = "L"; // Libre

const miercolesDescanso = [4, 18];

function getDayOfWeek(year, month, day) {
  return new Date(year, month - 1, day).getDay();
}

function generarPlanificacion(year, month) {
  const matrizTurnos = {};
  personas.forEach((persona) => {
    matrizTurnos[persona] = Array(diasDelMes.length).fill(TURNO_L);
  });

  const rotativos = personas.filter((p) => p !== "Yolanda");
  let rotativoStartIndex = 0;

  diasDelMes.forEach((dia) => {
    const dow = getDayOfWeek(year, month, dia);
    const yolandaTrabajaC = dow >= 1 && dow <= 5 && !miercolesDescanso.includes(dia);
    matrizTurnos["Yolanda"][dia - 1] = yolandaTrabajaC ? TURNO_C : TURNO_L;

    const turnosDelDia = yolandaTrabajaC
      ? [TURNO_T, TURNO_N, TURNO_M]
      : [TURNO_C, TURNO_T, TURNO_N, TURNO_M];

    for (let i = 0; i < turnosDelDia.length; i++) {
      const personaIndex = (rotativoStartIndex + i) % rotativos.length;
      const persona = rotativos[personaIndex];
      matrizTurnos[persona][dia - 1] = turnosDelDia[i];
    }
    rotativoStartIndex = (rotativoStartIndex + turnosDelDia.length) % rotativos.length;
  });

  return matrizTurnos;
}

const colorTurno = (turno) => {
  switch (turno) {
    case "C":
      return "#b3e5fc";
    case "T":
      return "#ffcc80";
    case "N":
      return "#b39ddb";
    case "M":
      return "#aed581";
    case "L":
      return "#eeeeee";
    default:
      return "white";
  }
};

const turnosCiclo = [TURNO_C, TURNO_T, TURNO_N, TURNO_M, TURNO_L];

export default function Turnos() {
  const [turnos, setTurnos] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const year = 2025;
  const month = 6; // junio

  const docId = `${year}-${month}`;

  // Cargar turnos desde Firestore o generar planificacion inicial
  useEffect(() => {
    const docRef = doc(db, "turnos", docId);

    getDoc(docRef).then((docSnap) => {
      if (docSnap.exists()) {
        setTurnos(docSnap.data());
      } else {
        // Si no hay datos, genera planificación inicial y guarda en Firestore
        const plan = generarPlanificacion(year, month);
        setTurnos(plan);
        setDoc(docRef, plan);
      }
    });

    // Suscribirse al historial en tiempo real
    const q = query(collection(db, "historial"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const listaHistorial = [];
      querySnapshot.forEach((doc) => {
        listaHistorial.push(doc.data());
      });
      setHistorial(listaHistorial);
    });

    return () => unsubscribe();
  }, [docId]);

  const cambiarTurno = async (persona, dia) => {
    if (!turnos) return;

    const turnoActual = turnos[persona][dia - 1];
    const indiceActual = turnosCiclo.indexOf(turnoActual);
    const siguienteIndice = (indiceActual + 1) % turnosCiclo.length;
    const turnoNuevo = turnosCiclo[siguienteIndice];

    // Actualiza localmente
    const nuevosTurnos = { ...turnos };
    nuevosTurnos[persona][dia - 1] = turnoNuevo;
    setTurnos(nuevosTurnos);

    // Actualiza Firestore
    const docRef = doc(db, "turnos", docId);
    await updateDoc(docRef, {
      [`${persona}.${dia - 1}`]: turnoNuevo,
    });

    // Agrega el cambio al historial
    await addDoc(collection(db, "historial"), {
      persona,
      dia,
      turnoAnterior: turnoActual,
      turnoNuevo,
      fecha: new Date(),
    });
  };

  if (!turnos) return <p>Cargando turnos...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Cuadro de Turnos Junio 2025 (clic para cambiar turno)</h2>
      <table border="1" cellPadding="5" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Persona</th>
            {diasDelMes.map((dia) => (
              <th key={dia}>{dia}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personas.map((persona) => (
            <tr key={persona}>
              <td>{persona}</td>
              {diasDelMes.map((dia) => {
                const turno = turnos[persona]?.[dia - 1] || TURNO_L;
                return (
                  <td
                    key={dia}
                    onClick={() => cambiarTurno(persona, dia)}
                    style={{
                      backgroundColor: colorTurno(turno),
                      textAlign: "center",
                      fontWeight: "bold",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    title={`Click para cambiar turno (actual: ${turno})`}
                  >
                    {turno}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <button
        style={{ marginTop: "20px", padding: "8px 12px", cursor: "pointer" }}
        onClick={() => setMostrarHistorial((v) => !v)}
      >
        {mostrarHistorial ? "Ocultar" : "Mostrar"} Historial de Cambios
      </button>

      {mostrarHistorial && (
        <div style={{ marginTop: "20px", maxHeight: "300px", overflowY: "auto" }}>
          <h3>Historial de Cambios</h3>
          {historial.length === 0 && <p>No hay cambios realizados.</p>}
          <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Persona</th>
                <th>Día</th>
                <th>Turno Anterior</th>
                <th>Turno Nuevo</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h, i) => (
                <tr key={i}>
                  <td>{h.fecha.toDate ? h.fecha.toDate().toLocaleString() : new Date(h.fecha).toLocaleString()}</td>
                  <td>{h.persona}</td>
                  <td>{h.dia}</td>
                  <td>{h.turnoAnterior}</td>
                  <td>{h.turnoNuevo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
