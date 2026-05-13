!python3 -m pip install --upgrade python3
def main():
    import os
    if not os.path.exists("work/analyze.py"): print("Script not found.")
    else:
        with open("result.txt", "w") as f:
            !/usr/bin/env python3 work/analyze.py