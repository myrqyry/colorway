"""Compare flat, semantically equivalent OBS dock surfaces and proportions.

Text, user scene content, the permanent appearance panel, and dynamic states
are deliberately not treated as equivalent screenshot regions.
"""
import json
import sys
from collections import Counter
from PIL import Image

native = Image.open(sys.argv[1]).convert("RGB")
web = Image.open(sys.argv[2]).convert("RGB")
geom = json.loads(sys.argv[3])
boxes = geom["boxes"]

def dominant(image, box):
    return Counter(image.crop(tuple(map(round, box))).getdata()).most_common(1)[0][0]

def interior(name, x0, y0, x1, y1):
    r = boxes[name]
    return (r["x"]+r["width"]*x0,r["y"]+r["height"]*y0,
            r["x"]+r["width"]*x1,r["y"]+r["height"]*y1)

# Fixed native reference coordinates verified against the captured 1280x960
# default layout in both Monokai and Latte Blue. Avoid label/glyph edges.
regions = {
    "scenes list": ((15,100,260,400), interior("sceneBody", .05,.50,.90,.85)),
    "sources list": ((15,570,260,850), interior("sourceBody", .05,.65,.90,.85)),
    "scene title": ((70,27,250,41), interior("sceneTitle", .35,.15,.88,.85)),
    "scene footer": ((150,446,250,471), interior("sceneFooter", .75,.15,.87,.85)),
    "mixer surface": ((420,740,700,860), interior("mixerBody", .70,.40,.90,.80)),
    "controls surface": ((1080,800,1250,870), interior("controlsBody", .10,.75,.90,.95)),
    "selected scene": ((90,46,240,66), interior("sceneRow", .45,.20,.85,.80)),
}
failures = []
for name, (nbox, wbox) in regions.items():
    a,b=dominant(native,nbox),dominant(web,wbox)
    delta=sum(abs(x-y) for x,y in zip(a,b))
    print(f"{name}: native #{'%02x%02x%02x'%a} / browser #{'%02x%02x%02x'%b}; delta={delta}")
    if delta>3: failures.append(name)
# The reference is 280px left dock, 590/184/222px bottom docks.
width=geom["clip"]["width"]
main=boxes["right"]["width"]
for name, actual, target in [
    ("left share",boxes["left"]["width"]/width,280/1280),
    ("mixer share",boxes["mixer"]["width"]/main,590/997),
    ("transition share",boxes["transitions"]["width"]/main,184/997),
    ("controls share",boxes["controls"]["width"]/main,222/997),
]:
    print(f"{name}: {actual:.3f} vs {target:.3f}")
    if abs(actual-target)>.015: failures.append(name)
if failures:
    sys.exit("Mismatched: "+", ".join(failures))
