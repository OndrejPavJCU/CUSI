"""
VisionGuard AI - Interaktivní kalibrační nástroj pro zaměření zón (calibrate_zones.py)
Umožňuje snadno naklikat body polygonů ROAD_ZONE a GATE_ZONE přímo na živém obraze z kamery
a automaticky vygenerovat kód souřadnic pro vložení do config.py.

OVLÁDÁNÍ:
- Levé tlačítko myši: Přidat bod do aktuálně vybrané zóny
- Klávesa 'r': Přepnout na kalibraci ROAD_ZONE (Silnice, modrá)
- Klávesa 'g': Přepnout na kalibraci GATE_ZONE (Branka, zelená)
- Klávesa 'c': Smazat body aktuální zóny
- Klávesa 's': Vypsat finální souřadnice do konzole
- Klávesa 'q' nebo ESC: Ukončit program
"""

import cv2
import numpy as np
from config import Config

# Aktuální zóna: 'road' nebo 'gate'
current_mode = "road"
road_points = list(Config.ROAD_ZONE)
gate_points = list(Config.GATE_ZONE)


def mouse_callback(event, x, y, flags, param):
    """Zpracování kliknutí myší do okna."""
    global road_points, gate_points, current_mode

    if event == cv2.EVENT_LBUTTONDOWN:
        if current_mode == "road":
            road_points.append((x, y))
            print(f"[ROAD_ZONE] Přidán bod: ({x}, {y})")
        else:
            gate_points.append((x, y))
            print(f"[GATE_ZONE] Přidán bod: ({x}, {y})")


def print_coordinates():
    """Vypíše do terminálu naformátovaný Python kód pro config.py."""
    print("\n" + "=" * 60)
    print("  VYGENEROVANÉ SOUŘADNICE PRO VLOŽENÍ DO config.py:")
    print("=" * 60)
    print("ROAD_ZONE = [")
    for pt in road_points:
        print(f"    ({pt[0]}, {pt[1]}),")
    print("]\n")

    print("GATE_ZONE = [")
    for pt in gate_points:
        print(f"    ({pt[0]}, {pt[1]}),")
    print("]")
    print("=" * 60 + "\n")


def main():
    global current_mode, road_points, gate_points

    print("=" * 60)
    print("  VisionGuard AI - Kalibrátor polygonálních zón")
    print("=" * 60)
    print("Připojuji se ke kameře:", Config.RTSP_URL)

    source = int(Config.RTSP_URL) if Config.RTSP_URL.isdigit() else Config.RTSP_URL
    cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        print(f"[Chyba] Nelze otevřít stream {Config.RTSP_URL}.")
        print("Tip: Můžete otestovat webkameru zadáním RTSP_URL=0 v .env, nebo zadat cestu k videosouboru/fotce.")
        return

    # Načtení prvního snímku
    ret, frame = cap.read()
    if not ret or frame is None:
        print("[Chyba] Nepodařilo se přečíst snímek z kamery.")
        cap.release()
        return

    window_name = "VisionGuard - Kalibrator Zon (Kliknete pro body, 'r'=Road, 'g'=Gate, 's'=Save, 'q'=Quit)"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(window_name, mouse_callback)

    while True:
        # Získání čerstvého snímku (nebo opakované kreslení na statický)
        ret, frame_live = cap.read()
        display_frame = (frame_live if ret and frame_live is not None else frame).copy()

        # Vykreslení ROAD_ZONE polygonu (Modrá)
        if len(road_points) > 1:
            pts = np.array(road_points, np.int32)
            cv2.polylines(display_frame, [pts], isClosed=True, color=(255, 140, 0), thickness=2)
        for pt in road_points:
            cv2.circle(display_frame, pt, 5, (255, 140, 0), -1)

        # Vykreslení GATE_ZONE polygonu (Zelená)
        if len(gate_points) > 1:
            pts = np.array(gate_points, np.int32)
            cv2.polylines(display_frame, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
        for pt in gate_points:
            cv2.circle(display_frame, pt, 5, (0, 255, 0), -1)

        # Horní informační lišta
        mode_text = f"AKTIVNI MOD: {'[R] ROAD_ZONE (Silnice/SPZ)' if current_mode == 'road' else '[G] GATE_ZONE (Branka/Osoby)'}"
        mode_color = (255, 140, 0) if current_mode == "road" else (0, 255, 0)
        cv2.putText(display_frame, mode_text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.75, mode_color, 2)
        cv2.putText(display_frame, "Klavesy: [R] Road | [G] Gate | [C] Vymazat | [S] Vypsat kod | [Q] Konec", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)

        cv2.imshow(window_name, display_frame)
        key = cv2.waitKey(30) & 0xFF

        if key == ord("q") or key == 27:  # ESC nebo 'q'
            break
        elif key == ord("r"):
            current_mode = "road"
            print(">> Přepnuto na ROAD_ZONE")
        elif key == ord("g"):
            current_mode = "gate"
            print(">> Přepnuto na GATE_ZONE")
        elif key == ord("c"):
            if current_mode == "road":
                road_points.clear()
                print(">> ROAD_ZONE vymazána")
            else:
                gate_points.clear()
                print(">> GATE_ZONE vymazána")
        elif key == ord("s"):
            print_coordinates()

    cap.release()
    cv2.destroyAllWindows()
    print_coordinates()


if __name__ == "__main__":
    main()
