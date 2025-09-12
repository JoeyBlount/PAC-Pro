"""
Script to add difference columns to all remaining PAC table rows
"""
import re

def add_difference_columns():
    file_path = "../client/src/pages/pac/PacTab.js"
    
    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # List of expense names that need difference columns
    expenses = [
        "Management Labor",
        "Payroll Tax",
        "Travel",
        "Advertising",
        "Advertising Other",
        "Promotion",
        "Outside Services",
        "Linen",
        "Operating Supply",
        "Maintenance & Repair",
        "Small Equipment",
        "Utilities",
        "Office",
        "Cash +/-",
        "Misc: CR/TR/D&S",
        "Total Controllable",
        "P.A.C."
    ]
    
    # Pattern to find rows that end with </TableRow> but don't have difference column
    pattern = r'(\s+<TableCell align="right">\s*\{getProjectedValue\("([^"]+)", "percent"\)\}\s*</TableCell>\s*</TableRow>)'
    
    def replace_row(match):
        full_match = match.group(1)
        expense_name = match.group(2)
        
        if expense_name in expenses:
            # Add the difference column
            difference_column = f'''
              <TableCell align="right">
                {{formatDifference(
                  pacData.controllableExpenses.{get_property_name(expense_name)}.dollars,
                  getProjectedValueAsNumber("{expense_name}")
                )}}
              </TableCell>
            </TableRow>'''
            
            return full_match.replace('</TableRow>', difference_column)
        else:
            # Add empty difference column for rows that don't have dollar values
            return full_match.replace('</TableRow>', '''
              <TableCell align="right">-</TableCell>
            </TableRow>''')
    
    def get_property_name(expense_name):
        """Convert expense name to camelCase property name"""
        name_map = {
            "Management Labor": "managementLabor",
            "Payroll Tax": "payrollTax",
            "Travel": "travel",
            "Advertising": "advertising",
            "Advertising Other": "advertisingOther",
            "Promotion": "promotion",
            "Outside Services": "outsideServices",
            "Linen": "linen",
            "Operating Supply": "operatingSupply",
            "Maintenance & Repair": "maintenanceRepair",
            "Small Equipment": "smallEquipment",
            "Utilities": "utilities",
            "Office": "office",
            "Cash +/-": "cashAdjustments",
            "Misc: CR/TR/D&S": "misc",
            "Total Controllable": "totalControllableDollars",
            "P.A.C.": "pacDollars"
        }
        return name_map.get(expense_name, expense_name.lower().replace(" ", "").replace("&", "").replace("/", "").replace("+", "").replace("-", ""))
    
    # Apply the replacement
    new_content = re.sub(pattern, replace_row, content)
    
    # Write the updated content back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully added difference columns to all remaining rows!")

if __name__ == "__main__":
    add_difference_columns()
