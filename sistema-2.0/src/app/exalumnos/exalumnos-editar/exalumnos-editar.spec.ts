import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExalumnosEditar } from './exalumnos-editar';

describe('ExalumnosEditar', () => {
  let component: ExalumnosEditar;
  let fixture: ComponentFixture<ExalumnosEditar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExalumnosEditar],
    }).compileComponents();

    fixture = TestBed.createComponent(ExalumnosEditar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
