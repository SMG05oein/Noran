package com.recode.Dwaeji.common.excel;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.*;

/**
 * Admin Excel theme: light header + dark body + dark sheet canvas
 * (empty area outside the table is also charcoal so it is not glaring white).
 */
public final class ExcelDarkTheme {

    private static final byte[] HEADER_BG = rgb(236, 236, 236);  // #ECECEC
    private static final byte[] HEADER_FG = rgb(32, 32, 32);     // #202020
    private static final byte[] BODY_BG = rgb(30, 30, 30);       // #1E1E1E
    private static final byte[] BODY_ALT_BG = rgb(42, 42, 42);   // #2A2A2A
    private static final byte[] BODY_FG = rgb(232, 232, 232);    // #E8E8E8
    private static final byte[] BORDER = rgb(64, 64, 64);        // #404040
    private static final byte[] TAB = rgb(88, 166, 255);

    /** Visible canvas beyond the data table (cols / extra rows). */
    private static final int SHEET_COL_SPAN = 52;   // A–AZ
    private static final int SHEET_EXTRA_ROWS = 80;

    private ExcelDarkTheme() {}

    public record Styles(CellStyle header, CellStyle body, CellStyle bodyAlt, CellStyle sheetBg) {}

    public static Styles create(Workbook workbook) {
        XSSFWorkbook xssf;
        if (workbook instanceof XSSFWorkbook) {
            xssf = (XSSFWorkbook) workbook;
        } else if (workbook instanceof org.apache.poi.xssf.streaming.SXSSFWorkbook) {
            xssf = ((org.apache.poi.xssf.streaming.SXSSFWorkbook) workbook).getXSSFWorkbook();
        } else {
            throw new IllegalArgumentException("ExcelDarkTheme requires XSSFWorkbook or SXSSFWorkbook");
        }
        DefaultIndexedColorMap colorMap = new DefaultIndexedColorMap();

        XSSFFont headerFont = xssf.createFont();
        headerFont.setBold(true);
        headerFont.setFontHeightInPoints((short) 11);
        headerFont.setColor(new XSSFColor(HEADER_FG, colorMap));

        XSSFFont bodyFont = xssf.createFont();
        bodyFont.setFontHeightInPoints((short) 10);
        bodyFont.setColor(new XSSFColor(BODY_FG, colorMap));

        XSSFCellStyle header = xssf.createCellStyle();
        fill(header, HEADER_BG, colorMap);
        border(header, colorMap);
        header.setFont(headerFont);
        header.setAlignment(HorizontalAlignment.CENTER);
        header.setVerticalAlignment(VerticalAlignment.CENTER);

        XSSFCellStyle body = xssf.createCellStyle();
        fill(body, BODY_BG, colorMap);
        border(body, colorMap);
        body.setFont(bodyFont);
        body.setVerticalAlignment(VerticalAlignment.CENTER);

        XSSFCellStyle bodyAlt = xssf.createCellStyle();
        fill(bodyAlt, BODY_ALT_BG, colorMap);
        border(bodyAlt, colorMap);
        bodyAlt.setFont(bodyFont);
        bodyAlt.setVerticalAlignment(VerticalAlignment.CENTER);

        // No borders — empty canvas around the table
        XSSFCellStyle sheetBg = xssf.createCellStyle();
        fill(sheetBg, BODY_BG, colorMap);
        sheetBg.setFont(bodyFont);

        return new Styles(header, body, bodyAlt, sheetBg);
    }

    /**
     * @param lastDataRowInclusive last row index that has data (0 = header only)
     * @param columnCount number of table columns to style
     */
    public static void apply(Sheet sheet, Styles styles, int lastDataRowInclusive, int columnCount) {
        if (columnCount <= 0) {
            return;
        }
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) {
            headerRow = sheet.createRow(0);
        }
        headerRow.setHeightInPoints(22);
        for (int c = 0; c < columnCount; c++) {
            Cell cell = headerRow.getCell(c);
            if (cell == null) {
                cell = headerRow.createCell(c);
            }
            cell.setCellStyle(styles.header());
        }

        for (int r = 1; r <= lastDataRowInclusive; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                row = sheet.createRow(r);
            }
            CellStyle rowStyle = (r % 2 == 0) ? styles.bodyAlt() : styles.body();
            for (int c = 0; c < columnCount; c++) {
                Cell cell = row.getCell(c);
                if (cell == null) {
                    cell = row.createCell(c);
                }
                cell.setCellStyle(rowStyle);
            }
        }

        paintSheetCanvas(sheet, styles, lastDataRowInclusive, columnCount);

        if (sheet instanceof XSSFSheet) {
            ((XSSFSheet) sheet).setTabColor(new XSSFColor(TAB, new DefaultIndexedColorMap()));
        } else if (sheet instanceof org.apache.poi.xssf.streaming.SXSSFSheet) {
            // setTabColor is not directly available on SXSSFSheet.
            // Safe to skip tab color for streaming sheets.
        }
        sheet.createFreezePane(0, 1);
    }

    /**
     * Darken empty area to the right of / below the table.
     * Excel has no true "sheet background"; we fill a visible canvas + default column styles.
     */
    private static void paintSheetCanvas(Sheet sheet, Styles styles, int lastDataRowInclusive, int columnCount) {
        CellStyle bg = styles.sheetBg();
        int colSpan = Math.max(SHEET_COL_SPAN, columnCount + 12);
        int lastCanvasRow = Math.max(lastDataRowInclusive + SHEET_EXTRA_ROWS, SHEET_EXTRA_ROWS);

        for (int c = 0; c < colSpan; c++) {
            sheet.setDefaultColumnStyle(c, bg);
        }

        // Right of table on header + data rows
        for (int r = 0; r <= lastDataRowInclusive; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                row = sheet.createRow(r);
            }
            for (int c = columnCount; c < colSpan; c++) {
                Cell cell = row.getCell(c);
                if (cell == null) {
                    cell = row.createCell(c);
                }
                cell.setCellStyle(bg);
            }
        }

        // Rows below the table
        for (int r = lastDataRowInclusive + 1; r <= lastCanvasRow; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                row = sheet.createRow(r);
            }
            row.setRowStyle(bg);
            for (int c = 0; c < colSpan; c++) {
                Cell cell = row.getCell(c);
                if (cell == null) {
                    cell = row.createCell(c);
                }
                cell.setCellStyle(bg);
            }
        }
    }

    /**
     * Dark body row style with a custom fill (e.g. status tint). Same font/border as theme body.
     */
    public static CellStyle createBodyStyle(Workbook workbook, byte[] fillRgb) {
        XSSFWorkbook xssf;
        if (workbook instanceof XSSFWorkbook) {
            xssf = (XSSFWorkbook) workbook;
        } else if (workbook instanceof org.apache.poi.xssf.streaming.SXSSFWorkbook) {
            xssf = ((org.apache.poi.xssf.streaming.SXSSFWorkbook) workbook).getXSSFWorkbook();
        } else {
            throw new IllegalArgumentException("ExcelDarkTheme requires XSSFWorkbook or SXSSFWorkbook");
        }
        DefaultIndexedColorMap colorMap = new DefaultIndexedColorMap();
        XSSFFont bodyFont = xssf.createFont();
        bodyFont.setFontHeightInPoints((short) 10);
        bodyFont.setColor(new XSSFColor(BODY_FG, colorMap));
        XSSFCellStyle style = xssf.createCellStyle();
        fill(style, fillRgb, colorMap);
        border(style, colorMap);
        style.setFont(bodyFont);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    /** Convenience for callers that want RGB without duplicating the helper. */
    public static byte[] rgbBytes(int r, int g, int b) {
        return rgb(r, g, b);
    }

    private static void fill(XSSFCellStyle style, byte[] rgb, DefaultIndexedColorMap colorMap) {
        style.setFillForegroundColor(new XSSFColor(rgb, colorMap));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    }

    private static void border(XSSFCellStyle style, DefaultIndexedColorMap colorMap) {
        XSSFColor border = new XSSFColor(BORDER, colorMap);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(border);
        style.setBottomBorderColor(border);
        style.setLeftBorderColor(border);
        style.setRightBorderColor(border);
    }

    private static byte[] rgb(int r, int g, int b) {
        return new byte[]{(byte) r, (byte) g, (byte) b};
    }
}
