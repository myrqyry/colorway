-- Colorway Pattern Manager — Tools > Scripts > + > this file
-- Changes only patterns/pattern.svg; preserves an exact original as a backup.
local obs = obslua
local patterns = {
  { file = "pattern.svg", label = "Original — Diagonal" },
  { file = "bamboo.svg", label = "Bamboo" },
  { file = "bank-note.svg", label = "Bank Note" },
  { file = "charlie-brown.svg", label = "Charlie Brown" },
  { file = "diagonal-lines.svg", label = "Diagonal Lines" },
  { file = "formal-invitation.svg", label = "Formal Invitation" },
  { file = "heavy-rain.svg", label = "Heavy Rain" },
  { file = "morphing-diamonds.svg", label = "Morphing Diamonds" },
  { file = "parkay-floor.svg", label = "Parkay Floor" },
  { file = "pixel-dots.svg", label = "Pixel Dots" },
  { file = "rails.svg", label = "Rails" },
  { file = "rain.svg", label = "Rain" },
  { file = "tiny-checkers.svg", label = "Tiny Checkers" },
  { file = "zig-zag.svg", label = "Zig Zag" },
}
local selected, themes_dir, strength, current_settings = "pattern.svg", "", 100, nil

local function join(dir, name)
  local separator = package.config:sub(1, 1)
  if dir:sub(-1) == separator then return dir .. name end
  return dir .. separator .. name
end
local function default_dir()
  local xdg = os.getenv("XDG_CONFIG_HOME")
  if xdg and xdg ~= "" then return join(join(xdg, "obs-studio"), "themes") end
  local home = os.getenv("HOME")
  if home and home ~= "" then return join(join(join(home, ".config"), "obs-studio"), "themes") end
  return ""
end
local function read(path)
  local f = io.open(path, "rb")
  if not f then return nil end
  local data = f:read("*a")
  f:close()
  return data
end
local function atomic_write(path, bytes)
  local temporary = path .. ".colorway-writing"
  if read(temporary) ~= nil then return false, "Temporary file already exists: " .. temporary end
  local f, err = io.open(temporary, "wb")
  if not f then return false, err or "Cannot open temporary file" end
  local ok, why = f:write(bytes)
  if not ok then f:close(); os.remove(temporary); return false, why end
  f:flush()
  f:close()
  local moved, detail = os.rename(temporary, path)
  if not moved then os.remove(temporary); return false, detail end
  return true
end
local function report(detail, warning)
  obs.script_log(warning and obs.LOG_WARNING or obs.LOG_INFO, "Colorway: " .. detail)
  if current_settings then obs.obs_data_set_string(current_settings, "message", detail) end
end
local function valid_theme(dir)
  local base = read(join(dir, "Colorway.obt"))
  return base and base:find("com.myrqyry.Colorway", 1, true)
    and base:find("theme:patterns/pattern.svg", 1, true)
end
local function allowed(name)
  for _, entry in ipairs(patterns) do
    if entry.file == name then return true end
  end
  return false
end
local function autorereload_enabled()
  -- Never write OBS settings; only check whether it was already enabled.
  local cfg = default_dir()
  if cfg == "" then return false end
  local ini = read(join(cfg:sub(1, #cfg - #"themes" - 1), "user.ini"))
  if not ini then return false end
  local section = ""
  for line in ini:gmatch("[^\r\n]+") do
    section = line:match("^%s*%[([^%]]+)%]") or section
    if section == "Appearance" and line:match("^%s*AutoReload%s*=%s*true%s*$") then
      return true
    end
  end
  return false
end
local function request_reload()
  if not autorereload_enabled() then return false end
  -- OBS 32.2 watches .obt/.ovt when AutoReload=true. Re-write exactly one
  -- existing byte to refresh mtime; QSS content and theme ID stay identical.
  local f = io.open(join(themes_dir, "Colorway.obt"), "r+b")
  if not f then return false end
  local first = f:read(1)
  if not first then f:close(); return false end
  f:seek("set", 0)
  local done = f:write(first)
  f:flush()
  f:close()
  return done ~= nil
end
-- Strength scales the shipped artwork's existing alpha rather than fading the
-- whole Qt widget. Read a fresh source each Apply: never multiply an already
-- modified installed pattern, which would accumulate rounding and drift.
local function scale_pattern_alpha(bytes, percent)
  if percent == 100 then return bytes end
  local invalid = false
  local output, count = bytes:gsub('fill%-opacity="([%d%.]+)"', function(alpha)
    local value = tonumber(alpha)
    if not value or value < 0 or value > 1 then invalid = true; return 'fill-opacity="' .. alpha .. '"' end
    local scaled = math.min(1, value * percent / 100)
    local formatted = string.format("%.4f", scaled):gsub("0+$", ""):gsub("%.$", "")
    return 'fill-opacity="' .. formatted .. '"'
  end)
  if invalid or count == 0 then
    return nil, "Pattern lacks supported fill-opacity artwork (nothing changed)"
  end
  return output
end

local function apply(name)
  if not allowed(name) then report("Unsupported pattern (nothing changed)", true); return false end
  if type(strength) ~= "number" or strength < 0 or strength > 300 or strength ~= math.floor(strength) then
    report("Pattern strength must be between 0 and 300% (nothing changed)", true)
    return false
  end
  if themes_dir == "" or not valid_theme(themes_dir) then
    report("Choose the folder containing Colorway.obt and patterns/", true)
    return false
  end
  local dir = join(themes_dir, "patterns")
  local target, backup = join(dir, "pattern.svg"), join(dir, ".colorway-original.svg")
  local existing = read(target)
  if not existing or #existing == 0 then
    report("Original pattern.svg is missing (nothing changed)", true)
    return false
  end
  local saved = read(backup)
  if not saved then
    local ok, err = atomic_write(backup, existing)
    if not ok then report("Cannot preserve original: " .. tostring(err), true); return false end
    saved = existing
  end
  local next_bytes = name == "pattern.svg" and saved or read(join(dir, name))
  if not next_bytes or #next_bytes > 131072 or
      not next_bytes:match("^%s*<svg[%s>]") or
      next_bytes:find("<!DOCTYPE", 1, true) or
      next_bytes:find("<script", 1, true) or
      next_bytes:find("<foreignObject", 1, true) or
      next_bytes:find("href=", 1, true) then
    report("Selected SVG missing or unsafe (nothing changed)", true)
    return false
  end
  local scaled, reason = scale_pattern_alpha(next_bytes, strength)
  if not scaled then report(reason, true); return false end
  next_bytes = scaled
  if existing == next_bytes then report("Already showing " .. name .. " at " .. strength .. "%"); return true end
  local ok, err = atomic_write(target, next_bytes)
  if not ok then report("Could not save pattern: " .. tostring(err), true); return false end
  if request_reload() then
    report("Applied " .. name .. " at " .. strength .. "%; requested OBS theme reload")
  else
    report("Applied " .. name .. " at " .. strength .. "%; restart OBS (or enable Appearance.AutoReload once)")
  end
  return true
end

function script_description()
  return "Colorway Pattern Manager — pick among the installed patterns and restore the original. "
    .. "Pattern strength is 0-300%; 100% preserves original artwork, 0% hides it. "
    .. "Use Apply pattern to save selection and strength. Backs up your exact starting SVG. "
    .. "Does not change the current OBS theme. Live refresh requires AutoReload=true "
    .. "in the OBS user.ini [Appearance] section before OBS starts."
end
function script_defaults(settings)
  obs.obs_data_set_default_string(settings, "themes_dir", default_dir())
  obs.obs_data_set_default_string(settings, "pattern", "pattern.svg")
  obs.obs_data_set_default_int(settings, "strength", 100)
end
function script_update(settings)
  current_settings = settings
  themes_dir = obs.obs_data_get_string(settings, "themes_dir")
  selected = obs.obs_data_get_string(settings, "pattern")
  strength = obs.obs_data_get_int(settings, "strength")
end
function script_apply() return apply(selected) end
function script_restore()
  -- Restore the exact unmodified original, and make the visible controls
  -- reflect it instead of leaving stale selection and intensity values.
  selected, strength = "pattern.svg", 100
  if current_settings then
    obs.obs_data_set_string(current_settings, "pattern", selected)
    obs.obs_data_set_int(current_settings, "strength", strength)
  end
  return apply(selected)
end
function script_properties()
  local props = obs.obs_properties_create()
  obs.obs_properties_add_path(props, "themes_dir", "Colorway themes directory",
    obs.OBS_PATH_DIRECTORY, nil, nil)
  local list = obs.obs_properties_add_list(props, "pattern", "Background pattern",
    obs.OBS_COMBO_TYPE_LIST, obs.OBS_COMBO_FORMAT_STRING)
  for _, entry in ipairs(patterns) do obs.obs_property_list_add_string(list, entry.label, entry.file) end
  obs.obs_properties_add_int_slider(props, "strength", "Pattern strength (%)", 0, 300, 5)
  obs.obs_properties_add_button(props, "apply", "Apply pattern", script_apply)
  obs.obs_properties_add_button(props, "restore", "Restore original", script_restore)
  obs.obs_properties_add_text(props, "message", "Last action", obs.OBS_TEXT_INFO)
  return props
end
