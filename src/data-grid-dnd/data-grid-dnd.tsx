import clamp from "lodash/clamp";
import * as React from "react";
import DataGrid, { DataGridProps, DataGridRef } from "../data-grid/data-grid";
import { GridColumn, GridMouseEventArgs } from "../data-grid/data-grid-types";

type Props = Omit<DataGridProps, "dragAndDropState" | "isResizing" | "isDragging" | "onMouseMove" | "allowResize">;

export interface DataGridDndProps extends Props {
    readonly onColumnMoved?: (startIndex: number, endIndex: number) => void;
    readonly onColumnResized?: (column: GridColumn, newSize: number) => void;
    readonly gridRef?: React.Ref<DataGridRef>;
    readonly maxColumnWidth?: number;
}

const DataGridDnd: React.FunctionComponent<DataGridDndProps> = p => {
    const [resizeColStartX, setResizeColStartX] = React.useState<number>();
    const [resizeCol, setResizeCol] = React.useState<number>();
    const [dragCol, setDragCol] = React.useState<number>();
    const [dropCol, setDropCol] = React.useState<number>();
    const [dragActive, setDragActive] = React.useState(false);
    const [dragStartX, setDragStartX] = React.useState<number>();

    const {
        firstColSticky,
        onColumnMoved,
        onMouseDown,
        onMouseUp,
        onItemHovered,
        isDraggable,
        columns,
        onColumnResized,
        gridRef,
        maxColumnWidth,
    } = p;

    const onItemHoveredImpl = React.useCallback(
        (args: GridMouseEventArgs) => {
            const [col] = args.location;
            if (dragCol !== undefined && dropCol !== col && (!firstColSticky || col > 0)) {
                setDragActive(true);
                setDropCol(col);
            }
            onItemHovered?.(args);
        },
        [dragCol, dropCol, firstColSticky, onItemHovered]
    );

    const canDragCol = onColumnMoved !== undefined;
    const onMouseDownImpl = React.useCallback(
        (args: GridMouseEventArgs) => {
            let shouldFireEvent = true;
            const [col] = args.location;
            if (
                !(isDraggable === true) &&
                (args.kind === "header" || args.kind === "cell") &&
                (!firstColSticky || col > 0)
            ) {
                if (args.isEdge) {
                    shouldFireEvent = false;
                    setResizeColStartX(args.bounds.x);
                    setResizeCol(col);
                } else if (args.kind === "header" && canDragCol) {
                    setDragStartX(args.bounds.x);
                    setDragCol(col);
                }
            }
            if (shouldFireEvent) onMouseDown?.(args);
        },
        [firstColSticky, isDraggable, onMouseDown, canDragCol]
    );

    const onMouseUpImpl = React.useCallback(
        (args: GridMouseEventArgs) => {
            setDragCol(undefined);
            setDropCol(undefined);
            setDragStartX(undefined);
            setDragActive(false);
            setResizeCol(undefined);
            setResizeColStartX(undefined);
            if (dragCol !== undefined && dropCol !== undefined) {
                if (dropCol !== undefined) {
                    onColumnMoved?.(dragCol, dropCol);
                }
            }
            onMouseUp?.(args);
        },
        [dragCol, dropCol, onColumnMoved, onMouseUp]
    );

    const dragOffset = React.useMemo(() => {
        if (dragCol === undefined || dropCol === undefined) return undefined;
        if (dragCol === dropCol) return undefined;

        return {
            src: dragCol,
            dest: dropCol,
        };
    }, [dragCol, dropCol]);

    const maxColumnWidthValue = maxColumnWidth === undefined ? 500 : maxColumnWidth < 50 ? 50 : maxColumnWidth;

    const onMouseMove = React.useCallback(
        (event: MouseEvent) => {
            if (dragCol !== undefined && dragStartX !== undefined) {
                const diff = Math.abs(event.clientX - dragStartX);
                if (diff > 20) {
                    setDragActive(true);
                }
            } else if (resizeCol !== undefined && resizeColStartX !== undefined) {
                const column = columns[resizeCol];
                const newWidth = clamp(event.clientX - resizeColStartX, 50, maxColumnWidthValue);
                onColumnResized?.(column, newWidth);
            }
        },
        [dragCol, dragStartX, resizeCol, resizeColStartX, columns, maxColumnWidthValue, onColumnResized]
    );

    return (
        <DataGrid
            {...p}
            isResizing={resizeCol !== undefined}
            isDragging={dragActive}
            onItemHovered={onItemHoveredImpl}
            onMouseDown={onMouseDownImpl}
            allowResize={onColumnResized !== undefined}
            onMouseUp={onMouseUpImpl}
            dragAndDropState={dragOffset}
            onMouseMove={onMouseMove}
            ref={gridRef}
        />
    );
};

export default DataGridDnd;
